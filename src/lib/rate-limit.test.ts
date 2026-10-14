import { afterEach, describe, expect, it } from 'vitest'
import {
  GLOBAL_SUBJECT,
  chatRules,
  enforceRateLimit,
  generateRules,
  hashSubject,
  ocrRules,
  rateLimitResponseInit,
  readClientIp,
  readLimitFromEnv,
  type RateLimitDeps,
  type RateLimitRule,
} from '@/lib/rate-limit'

const HOUR = 3600
const DAY = 86400

const ENV_KEYS = [
  'RATE_LIMIT_OCR_IP_PER_HOUR',
  'RATE_LIMIT_OCR_GLOBAL_PER_DAY',
  'RATE_LIMIT_GENERATE_IP_PER_HOUR',
  'RATE_LIMIT_GENERATE_EMAIL_PER_DAY',
  'RATE_LIMIT_GENERATE_GLOBAL_PER_DAY',
  'RATE_LIMIT_CHAT_IP_PER_HOUR',
  'RATE_LIMIT_CHAT_GLOBAL_PER_DAY',
]

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

type Row = { bucket: string; subjectType: string; subjectHash: string; at: number }

type Gates = {
  beforeRecord?: () => Promise<void>
  beforeCount?: () => Promise<void>
}

/**
 * 1 つのテーブルを共有する deps。record は追記、count はその場で数える。
 * gates を挟むことで、record と count の割り込み順を作り分ける。
 */
function makeStore(options: { recordFails?: boolean; countFails?: boolean } = {}) {
  const rows: Row[] = []
  let countCalls = 0

  const deps = (gates: Gates = {}): RateLimitDeps => ({
    async record({ bucket, subjectType, subjectHash }) {
      await gates.beforeRecord?.()
      if (options.recordFails) return false
      rows.push({ bucket, subjectType, subjectHash, at: Date.now() })
      return true
    },

    async count({ bucket, subjectType, subjectHash, since }) {
      await gates.beforeCount?.()
      countCalls += 1
      if (options.countFails) return null

      const from = Date.parse(since)
      return rows.filter(
        (row) =>
          row.bucket === bucket &&
          row.subjectType === subjectType &&
          row.subjectHash === subjectHash &&
          row.at >= from
      ).length
    },
  })

  return {
    rows,
    deps,
    get countCalls() {
      return countCalls
    },
  }
}

/** n 本そろうまで全員を待たせる。 */
function barrier(n: number) {
  let arrived = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  return async () => {
    arrived += 1
    if (arrived >= n) release()
    await gate
  }
}

/** マイクロタスクを n 回ゆずる。 */
function yieldTimes(n: number) {
  return async () => {
    for (let i = 0; i < n; i++) await Promise.resolve()
  }
}

function ipRule(limit: number, ip = '203.0.113.5'): RateLimitRule[] {
  return [{ subjectType: 'ip', subject: ip, limit, windowSeconds: HOUR }]
}

function countOk(results: { ok: boolean }[]): number {
  return results.filter((result) => result.ok).length
}

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
  it('OCR は IP 5回/時 と 全体 50回/日', () => {
    const [ip, global] = ocrRules('203.0.113.5')
    expect(ip).toMatchObject({ subjectType: 'ip', limit: 5, windowSeconds: HOUR })
    expect(global).toMatchObject({
      subjectType: 'global',
      subject: GLOBAL_SUBJECT,
      limit: 50,
      windowSeconds: DAY,
    })
  })

  it('generate は IP 5回/時、メール 3回/日、全体 100回/日', () => {
    const [ip, email, global] = generateRules('203.0.113.5', 'owner@example.test')
    expect(ip).toMatchObject({ subjectType: 'ip', limit: 5, windowSeconds: HOUR })
    expect(email).toMatchObject({ subjectType: 'email', limit: 3, windowSeconds: DAY })
    expect(global).toMatchObject({
      subjectType: 'global',
      subject: GLOBAL_SUBJECT,
      limit: 100,
      windowSeconds: DAY,
    })
  })

  it('chat は IP 20回/時 と 全体 500回/日', () => {
    const [ip, global] = chatRules('203.0.113.5')
    expect(ip).toMatchObject({ subjectType: 'ip', limit: 20, windowSeconds: HOUR })
    expect(global).toMatchObject({
      subjectType: 'global',
      subject: GLOBAL_SUBJECT,
      limit: 500,
      windowSeconds: DAY,
    })
  })

  it('全体の上限は環境変数で変えられる', () => {
    process.env.RATE_LIMIT_OCR_GLOBAL_PER_DAY = '7'
    process.env.RATE_LIMIT_GENERATE_GLOBAL_PER_DAY = '9'
    process.env.RATE_LIMIT_CHAT_GLOBAL_PER_DAY = '11'

    expect(ocrRules('203.0.113.5')[1].limit).toBe(7)
    expect(generateRules('203.0.113.5', 'a@example.test')[2].limit).toBe(9)
    expect(chatRules('203.0.113.5')[1].limit).toBe(11)
  })

  it('全体のルールは IP が違っても同じ subject を使う', () => {
    const a = ocrRules('203.0.113.5')[1]
    const b = ocrRules('198.51.100.7')[1]
    expect(a.subject).toBe(b.subject)
  })
})

describe('enforceRateLimit（順番に来た場合）', () => {
  it('上限ちょうどまで通し、その次を止める', async () => {
    const store = makeStore()
    const results = []

    for (let i = 0; i < 20; i++) {
      results.push(await enforceRateLimit('ocr', ipRule(5), store.deps()))
    }

    expect(countOk(results)).toBe(5)
    expect(results.slice(0, 5).every((result) => result.ok)).toBe(true)
    expect(results[5]).toEqual({
      ok: false,
      reason: 'limit_exceeded',
      retryAfterSeconds: HOUR,
    })
  })

  it('記録してから数えるので、拒否された分もウィンドウに残る', async () => {
    const store = makeStore()

    for (let i = 0; i < 6; i++) {
      await enforceRateLimit('ocr', ipRule(5), store.deps())
    }

    expect(store.rows).toHaveLength(6)
  })

  it('ルールごとに 1 件ずつ記録する', async () => {
    const store = makeStore()
    await enforceRateLimit(
      'generate',
      generateRules('203.0.113.5', 'owner@example.test'),
      store.deps()
    )

    expect(store.rows.map((row) => row.subjectType)).toEqual(['ip', 'email', 'global'])
    expect(store.rows.every((row) => row.bucket === 'generate')).toBe(true)
  })

  it('生の IP やメールを記録しない', async () => {
    const store = makeStore()
    await enforceRateLimit(
      'generate',
      generateRules('203.0.113.5', 'owner@example.test'),
      store.deps()
    )

    for (const row of store.rows) {
      expect(row.subjectHash).toMatch(/^[0-9a-f]{64}$/)
      expect(row.subjectHash).not.toContain('203.0.113.5')
      expect(row.subjectHash).not.toContain('owner')
    }
  })

  it('IP ごとの上限に余裕があっても、全体の上限で止まる', async () => {
    process.env.RATE_LIMIT_OCR_GLOBAL_PER_DAY = '3'
    const store = makeStore()
    const results = []

    // 全部ちがう IP から 1 回ずつ
    for (let i = 0; i < 10; i++) {
      results.push(await enforceRateLimit('ocr', ocrRules(`203.0.113.${i}`), store.deps()))
    }

    expect(countOk(results)).toBe(3)
    // 拒否された分も記録は残る（記録 → 数える の順なので）
    expect(store.rows.filter((row) => row.subjectType === 'global')).toHaveLength(10)
  })

  it('2 つ目のルールだけ超えていても止める', async () => {
    const store = makeStore()
    const rules: RateLimitRule[] = [
      { subjectType: 'ip', subject: '203.0.113.5', limit: 99, windowSeconds: HOUR },
      { subjectType: 'email', subject: 'owner@example.test', limit: 1, windowSeconds: DAY },
    ]

    expect((await enforceRateLimit('generate', rules, store.deps())).ok).toBe(true)
    expect(await enforceRateLimit('generate', rules, store.deps())).toEqual({
      ok: false,
      reason: 'limit_exceeded',
      retryAfterSeconds: DAY,
    })
  })

  it('数えられなかったら通さない（fail-closed）', async () => {
    const store = makeStore({ countFails: true })
    expect(await enforceRateLimit('ocr', ipRule(5), store.deps())).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 60,
    })
  })

  it('記録できなかったら数えずに止める', async () => {
    const store = makeStore({ recordFails: true })

    expect(await enforceRateLimit('ocr', ipRule(5), store.deps())).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 60,
    })
    expect(store.countCalls).toBe(0)
  })
})

describe('enforceRateLimit（同時に来た場合）', () => {
  it('全員が記録を終えてから数える並びでも、上限を超えて通らない', async () => {
    const store = makeStore()
    const atCount = barrier(20)

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        enforceRateLimit('ocr', ipRule(5), store.deps({ beforeCount: atCount }))
      )
    )

    // 20 本すべてが記録を済ませてから数えるので、全員が 20 件を見る
    expect(countOk(results)).toBeLessThanOrEqual(5)
    expect(countOk(results)).toBe(0)
    expect(store.rows).toHaveLength(20)
  })

  it('割り込み方を変えても、通るのは上限の本数以下', async () => {
    // record と count の間に挟むマイクロタスクの数を変えて、いくつもの並びを作る
    const patterns = [
      { record: 0, count: 1 },
      { record: 1, count: 0 },
      { record: 1, count: 3 },
      { record: 2, count: 2 },
      { record: 3, count: 1 },
      { record: 5, count: 7 },
    ]

    for (const pattern of patterns) {
      const store = makeStore()

      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          enforceRateLimit(
            'ocr',
            ipRule(5),
            store.deps({
              beforeRecord: yieldTimes((i * pattern.record) % 7),
              beforeCount: yieldTimes((i * pattern.count) % 5),
            })
          )
        )
      )

      expect(countOk(results)).toBeLessThanOrEqual(5)
      expect(store.rows).toHaveLength(20)
    }
  })

  it('同時でも、上限より多く通ることはない（ルールが複数でも）', async () => {
    process.env.RATE_LIMIT_GENERATE_GLOBAL_PER_DAY = '4'
    const store = makeStore()

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        enforceRateLimit(
          'generate',
          generateRules(`203.0.113.${i}`, `owner${i}@example.test`),
          store.deps({ beforeCount: yieldTimes(i % 3) })
        )
      )
    )

    expect(countOk(results)).toBeLessThanOrEqual(4)
  })

  it('同時に来ても 1 本も通らないわけではない（1 本ずつ順に来る並び）', async () => {
    const store = makeStore()
    const results: { ok: boolean }[] = []

    // 直列に見える並び＝記録と数えが交互に進む場合は、ちょうど上限まで通る
    for (let i = 0; i < 8; i++) {
      results.push(await enforceRateLimit('ocr', ipRule(5), store.deps()))
    }

    expect(countOk(results)).toBe(5)
  })
})

describe('rateLimitResponseInit', () => {
  it('上限超過は 429 と Retry-After を返す', () => {
    const init = rateLimitResponseInit({
      ok: false,
      reason: 'limit_exceeded',
      retryAfterSeconds: HOUR,
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
