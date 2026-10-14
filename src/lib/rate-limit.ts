import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase'

export type RateLimitBucket = 'ocr' | 'generate' | 'chat'
export type RateLimitSubjectType = 'ip' | 'email' | 'global'

/** subjectType が 'global' のときの subject。全体で 1 つのカウンタになる。 */
export const GLOBAL_SUBJECT = 'all'

export type RateLimitRule = {
  subjectType: RateLimitSubjectType
  /** 生の値（IP・メール）。保存時はハッシュ化される。 */
  subject: string
  limit: number
  windowSeconds: number
}

export type RateLimitResult =
  | { ok: true }
  /** 上限に達した。 */
  | { ok: false; reason: 'limit_exceeded'; retryAfterSeconds: number }
  /** 数えられなかった（テーブル未作成・DB障害）。安全側に倒して止める。 */
  | { ok: false; reason: 'unavailable'; retryAfterSeconds: number }

export type RateLimitDeps = {
  /** 期間内の件数。数えられなかった場合は null を返す。 */
  count: (args: {
    bucket: RateLimitBucket
    subjectType: RateLimitSubjectType
    subjectHash: string
    since: string
  }) => Promise<number | null>
  /** 1 件記録する。失敗したら false。 */
  record: (args: {
    bucket: RateLimitBucket
    subjectType: RateLimitSubjectType
    subjectHash: string
  }) => Promise<boolean>
}

const HOUR = 60 * 60
const DAY = 24 * HOUR

/** 生の IP・メールを保存しないためのハッシュ。 */
export function hashSubject(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * クライアント IP。Vercel は x-forwarded-for を必ず付ける。
 * 取れないときは 'unknown' という共有バケットに入れる（数えないのではなく、まとめて数える）。
 */
export function readClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')?.trim()
  return real || 'unknown'
}

export function readLimitFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function globalRule(envName: string, fallback: number): RateLimitRule {
  return {
    subjectType: 'global',
    subject: GLOBAL_SUBJECT,
    limit: readLimitFromEnv(envName, fallback),
    windowSeconds: DAY,
  }
}

export function ocrRules(ip: string): RateLimitRule[] {
  return [
    {
      subjectType: 'ip',
      subject: ip,
      limit: readLimitFromEnv('RATE_LIMIT_OCR_IP_PER_HOUR', 5),
      windowSeconds: HOUR,
    },
    globalRule('RATE_LIMIT_OCR_GLOBAL_PER_DAY', 50),
  ]
}

export function generateRules(ip: string, email: string): RateLimitRule[] {
  return [
    {
      subjectType: 'ip',
      subject: ip,
      limit: readLimitFromEnv('RATE_LIMIT_GENERATE_IP_PER_HOUR', 5),
      windowSeconds: HOUR,
    },
    {
      subjectType: 'email',
      subject: email,
      limit: readLimitFromEnv('RATE_LIMIT_GENERATE_EMAIL_PER_DAY', 3),
      windowSeconds: DAY,
    },
    globalRule('RATE_LIMIT_GENERATE_GLOBAL_PER_DAY', 100),
  ]
}

export function chatRules(ip: string): RateLimitRule[] {
  return [
    {
      subjectType: 'ip',
      subject: ip,
      limit: readLimitFromEnv('RATE_LIMIT_CHAT_IP_PER_HOUR', 20),
      windowSeconds: HOUR,
    },
    globalRule('RATE_LIMIT_CHAT_GLOBAL_PER_DAY', 500),
  ]
}

/**
 * 1 件記録してから、自分の分を含めて数え、上限を超えていたら拒否する。
 *
 * 「数えてから記録する」順だと、同時に来たリクエストが全部まだ 0 件の状態を見て
 * 全部通り抜ける。記録を先に済ませると、通るのは必ず limit 本以下になる:
 * 通ったリクエストは必ず「自分の記録を終えたあと」に数えているので、
 * 最後に数えた通過者からは、ほかの通過者の記録がすべて見えている。
 * limit+1 本が通ったと仮定すると、その最後の 1 本は limit+1 件を数えることになり、
 * 通っていないことになるため矛盾する。
 *
 * 代わりに、拒否されたリクエストの記録もウィンドウに残る（試行回数の制限になる）。
 *
 * 数えられなかった・記録できなかったときは通さない（fail-closed）。
 * レート制限テーブルが未作成のまま公開 API が無制限に Anthropic / Resend を
 * 呼ぶ状態を作らないため。
 */
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  rules: RateLimitRule[],
  injected?: RateLimitDeps
): Promise<RateLimitResult> {
  let deps: RateLimitDeps
  try {
    // 環境変数が無いと Supabase クライアントは作れない。数えられないので止める。
    deps = injected ?? supabaseRateLimitDeps()
  } catch (error) {
    console.error('rate limit: client unavailable:', error)
    return { ok: false, reason: 'unavailable', retryAfterSeconds: 60 }
  }

  const now = Date.now()

  for (const rule of rules) {
    const subjectHash = hashSubject(rule.subject)

    const recorded = await deps.record({
      bucket,
      subjectType: rule.subjectType,
      subjectHash,
    })
    if (!recorded) {
      return { ok: false, reason: 'unavailable', retryAfterSeconds: 60 }
    }

    const used = await deps.count({
      bucket,
      subjectType: rule.subjectType,
      subjectHash,
      since: new Date(now - rule.windowSeconds * 1000).toISOString(),
    })

    if (used === null) {
      return { ok: false, reason: 'unavailable', retryAfterSeconds: 60 }
    }
    // used は自分の 1 件を含む。limit と同じなら、自分がちょうど limit 本目。
    if (used > rule.limit) {
      return { ok: false, reason: 'limit_exceeded', retryAfterSeconds: rule.windowSeconds }
    }
  }

  return { ok: true }
}

export function supabaseRateLimitDeps(): RateLimitDeps {
  const supabase = createServiceClient()

  return {
    async count({ bucket, subjectType, subjectHash, since }) {
      const { count, error } = await supabase
        .from('rate_limit_events')
        .select('id', { count: 'exact', head: true })
        .eq('bucket', bucket)
        .eq('subject_type', subjectType)
        .eq('subject', subjectHash)
        .gte('created_at', since)

      if (error) {
        console.error('rate limit count failed:', error.message)
        return null
      }
      return count ?? 0
    },

    async record({ bucket, subjectType, subjectHash }) {
      const { error } = await supabase.from('rate_limit_events').insert({
        bucket,
        subject_type: subjectType,
        subject: subjectHash,
      })

      if (error) {
        console.error('rate limit record failed:', error.message)
        return false
      }
      return true
    },
  }
}

/** 429 / 503 のどちらを返すかと、Retry-After の値を決める。 */
export function rateLimitResponseInit(
  result: Extract<RateLimitResult, { ok: false }>
): { status: number; body: { error: string }; headers: Record<string, string> } {
  if (result.reason === 'limit_exceeded') {
    return {
      status: 429,
      body: { error: 'Too many requests. Please try again later.' },
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  }
  return {
    status: 503,
    body: { error: 'Rate limiting is unavailable. Please try again later.' },
    headers: { 'Retry-After': String(result.retryAfterSeconds) },
  }
}
