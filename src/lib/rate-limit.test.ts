import { afterEach, describe, expect, it } from 'vitest'
import {
  enforceRateLimit,
  generateRules,
  hashSubject,
  ocrRules,
  rateLimitResponseInit,
  readClientIp,
  readLimitFromEnv,
  type RateLimitDeps,
} from '@/lib/rate-limit'

type Recorded = { bucket: string; subjectType: string; subjectHash: string }

function fakeDeps(counts: number[] | null[], recordOk = true) {
  const recorded: Recorded[] = []
  let callIndex = 0

  const deps: RateLimitDeps = {
    async count() {
      const value = counts[Math.min(callIndex, counts.length - 1)]
      callIndex++
      return value
    },
    async record(args) {
      if (!recordOk) return false
      recorded.push(args)
      return true
    },
  }

  return { deps, recorded }
}

const ENV_KEYS = [
  'RATE_LIMIT_OCR_IP_PER_HOUR',
  'RATE_LIMIT_GENERATE_IP_PER_HOUR',
  'RATE_LIMIT_GENERATE_EMAIL_PER_DAY',
]

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

describe('readClientIp', () => {
  it('x-forwarded-for の先頭を使う', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' })
    expect(readClientIp(headers)).toBe('203.0.113.5')
  })

  it('前後の空白を落とす', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.5  ' })
    expect(readClientIp(headers)).toBe('203.0.113.5')
  })

  it('x-forwarded-for が無ければ x-real-ip を使う', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' })
    expect(readClientIp(headers)).toBe('198.51.100.7')
  })

  it('どちらも無ければ unknown にまとめる', () => {
    expect(readClientIp(new Headers())).toBe('unknown')
  })
})

describe('hashSubject', () => {
  it('同じ入力なら同じハッシュになる', () => {
    expect(hashSubject('203.0.113.5')).toBe(hashSubject('203.0.113.5'))
  })

  it('生の値を含まない', () => {
    const hash = hashSubject('owner@example.test')
    expect(hash).not.toContain('owner')
    expect(hash).not.toContain('example.test')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('別の入力なら別のハッシュになる', () => {
    expect(hashSubject('a@example.test')).not.toBe(hashSubject('b@example.test'))
  })
})

describe('readLimitFromEnv', () => {
  it('未設定なら既定値', () => {
    expect(readLimitFromEnv('RATE_LIMIT_OCR_IP_PER_HOUR', 5)).toBe(5)
  })

  it('正の整数なら採用する', () => {
    process.env.RATE_LIMIT_OCR_IP_PER_HOUR = '20'
    expect(readLimitFromEnv('RATE_LIMIT_OCR_IP_PER_HOUR', 5)).toBe(20)
  })

  it('0・負数・小数・文字列は既定値に戻す', () => {
    for (const bad of ['0', '-3', '2.5', 'ten', '']) {
      process.env.RATE_LIMIT_OCR_IP_PER_HOUR = bad
      expect(readLimitFromEnv('RATE_LIMIT_OCR_IP_PER_HOUR', 5)).toBe(5)
    }
  })
})

describe('ルールの既定値', () => {
  it('OCR は IP の 1 時間あたり 5 回', () => {
    const [rule] = ocrRules('203.0.113.5')
    expect(rule).toMatchObject({ subjectType: 'ip', limit: 5, windowSeconds: 3600 })
  })

  it('generate は IP 5回/時 と メール 3回/日', () => {
    const [ip, email] = generateRules('203.0.113.5', 'owner@example.test')
    expect(ip).toMatchObject({ subjectType: 'ip', limit: 5, windowSeconds: 3600 })
    expect(email).toMatchObject({ subjectType: 'email', limit: 3, windowSeconds: 86400 })
  })
})

describe('enforceRateLimit', () => {
  it('上限未満なら通し、ルールごとに 1 件記録する', async () => {
    const { deps, recorded } = fakeDeps([0, 0])
    const result = await enforceRateLimit(
      'generate',
      generateRules('203.0.113.5', 'owner@example.test'),
      deps
    )

    expect(result).toEqual({ ok: true })
    expect(recorded).toHaveLength(2)
    expect(recorded.map((entry) => entry.subjectType)).toEqual(['ip', 'email'])
    expect(recorded.every((entry) => entry.bucket === 'generate')).toBe(true)
  })

  it('生の IP やメールを記録しない', async () => {
    const { deps, recorded } = fakeDeps([0, 0])
    await enforceRateLimit('generate', generateRules('203.0.113.5', 'owner@example.test'), deps)

    for (const entry of recorded) {
      expect(entry.subjectHash).toMatch(/^[0-9a-f]{64}$/)
      expect(entry.subjectHash).not.toContain('203.0.113.5')
      expect(entry.subjectHash).not.toContain('owner')
    }
  })

  it('上限に達していたら止める', async () => {
    const { deps, recorded } = fakeDeps([5])
    const result = await enforceRateLimit('ocr', ocrRules('203.0.113.5'), deps)

    expect(result).toEqual({ ok: false, reason: 'limit_exceeded', retryAfterSeconds: 3600 })
    // 止めたときは記録を増やさない
    expect(recorded).toHaveLength(0)
  })

  it('2 つ目のルールだけ超えていても止める', async () => {
    const { deps, recorded } = fakeDeps([0, 3])
    const result = await enforceRateLimit(
      'generate',
      generateRules('203.0.113.5', 'owner@example.test'),
      deps
    )

    expect(result.ok).toBe(false)
    expect(recorded).toHaveLength(0)
  })

  it('数えられなかったら通さない（fail-closed）', async () => {
    const { deps, recorded } = fakeDeps([null])
    const result = await enforceRateLimit('ocr', ocrRules('203.0.113.5'), deps)

    expect(result).toEqual({ ok: false, reason: 'unavailable', retryAfterSeconds: 60 })
    expect(recorded).toHaveLength(0)
  })

  it('記録に失敗したら通さない', async () => {
    const { deps } = fakeDeps([0], false)
    const result = await enforceRateLimit('ocr', ocrRules('203.0.113.5'), deps)

    expect(result).toEqual({ ok: false, reason: 'unavailable', retryAfterSeconds: 60 })
  })

  it('環境変数で上限を上げられる', async () => {
    process.env.RATE_LIMIT_OCR_IP_PER_HOUR = '50'
    const { deps } = fakeDeps([20])
    const result = await enforceRateLimit('ocr', ocrRules('203.0.113.5'), deps)

    expect(result).toEqual({ ok: true })
  })
})

describe('rateLimitResponseInit', () => {
  it('上限超過は 429 と Retry-After を返す', () => {
    const init = rateLimitResponseInit({
      ok: false,
      reason: 'limit_exceeded',
      retryAfterSeconds: 3600,
    })

    expect(init.status).toBe(429)
    expect(init.headers['Retry-After']).toBe('3600')
  })

  it('数えられない場合は 503 を返す', () => {
    const init = rateLimitResponseInit({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 60,
    })

    expect(init.status).toBe(503)
    expect(init.headers['Retry-After']).toBe('60')
  })
})
