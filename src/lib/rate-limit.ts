import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase'

export type RateLimitBucket = 'ocr' | 'generate'
export type RateLimitSubjectType = 'ip' | 'email'

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

export function ocrRules(ip: string): RateLimitRule[] {
  return [
    {
      subjectType: 'ip',
      subject: ip,
      limit: readLimitFromEnv('RATE_LIMIT_OCR_IP_PER_HOUR', 5),
      windowSeconds: HOUR,
    },
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
  ]
}

/**
 * 上限を確認してから 1 件記録する。
 * 数えられなかったときは通さない（fail-closed）。レート制限テーブルが未作成のまま
 * 公開 API が無制限に Anthropic / Resend を呼ぶ状態を作らないため。
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
    const since = new Date(now - rule.windowSeconds * 1000).toISOString()

    const used = await deps.count({
      bucket,
      subjectType: rule.subjectType,
      subjectHash,
      since,
    })

    if (used === null) {
      return { ok: false, reason: 'unavailable', retryAfterSeconds: 60 }
    }
    if (used >= rule.limit) {
      return { ok: false, reason: 'limit_exceeded', retryAfterSeconds: rule.windowSeconds }
    }
  }

  for (const rule of rules) {
    const recorded = await deps.record({
      bucket,
      subjectType: rule.subjectType,
      subjectHash: hashSubject(rule.subject),
    })
    if (!recorded) {
      return { ok: false, reason: 'unavailable', retryAfterSeconds: 60 }
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
