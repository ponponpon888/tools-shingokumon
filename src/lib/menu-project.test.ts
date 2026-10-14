import { describe, expect, it } from 'vitest'
import {
  EXPIRE_UPDATE,
  REUSABLE_STATUSES,
  findReusableProject,
  isReusable,
  toFoundProject,
  type Client,
  type FingerprintRow,
} from '@/lib/menu-project'
import type { MenuStatus } from '@/types/database'

const FINGERPRINT = 'a'.repeat(64)

type Filters = {
  eq: Record<string, unknown>
  in: Record<string, readonly unknown[]>
  table: string | null
}

/**
 * supabase-js のクエリビルダーの、このクエリで使う部分だけを真似たもの。
 * 実際に絞り込みを適用するので、status の許可リストが効いているかを確かめられる。
 */
function fakeClient(options: {
  row?: { fingerprint: string; value: FingerprintRow }
  error?: string
}) {
  const filters: Filters = { eq: {}, in: {}, table: null }

  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.eq[column] = value
      return builder
    },
    in: (column: string, values: readonly unknown[]) => {
      filters.in[column] = values
      return builder
    },
    limit: () => builder,
    maybeSingle: async () => {
      if (options.error) {
        return { data: null, error: { message: options.error } }
      }
      const row = options.row
      if (!row) return { data: null, error: null }

      if (filters.eq.request_fingerprint !== row.fingerprint) {
        return { data: null, error: null }
      }
      const allowed = filters.in.status
      if (allowed && !allowed.includes(row.value.status)) {
        return { data: null, error: null }
      }
      return { data: row.value, error: null }
    },
  }

  const client = {
    from: (table: string) => {
      filters.table = table
      return builder
    },
  } as unknown as Client

  return { client, filters }
}

function row(status: MenuStatus, contactId: string | null = 'contact-1'): FingerprintRow {
  return { id: 'project-1', status, shops: contactId === null ? null : { contact_id: contactId } }
}

describe('REUSABLE_STATUSES', () => {
  it('expired を含まない', () => {
    expect(REUSABLE_STATUSES).not.toContain('expired')
  })

  it('メールが未送信・失敗の行は再利用の対象に含む', () => {
    expect(REUSABLE_STATUSES).toContain('generated')
    expect(REUSABLE_STATUSES).toContain('email_pending')
    expect(REUSABLE_STATUSES).toContain('email_failed')
  })
})

describe('isReusable', () => {
  it('生きている行だけ true', () => {
    expect(isReusable('generated')).toBe(true)
    expect(isReusable('email_pending')).toBe(true)
    expect(isReusable('email_failed')).toBe(true)
  })

  it('期限切れ・下書き・失敗は false', () => {
    for (const status of ['expired', 'draft', 'processing', 'failed'] as MenuStatus[]) {
      expect(isReusable(status)).toBe(false)
    }
  })
})

describe('EXPIRE_UPDATE', () => {
  it('status を expired にする', () => {
    expect(EXPIRE_UPDATE.status).toBe('expired')
  })

  it('request_fingerprint を外す（部分ユニークインデックスは NULL を無視する）', () => {
    expect(EXPIRE_UPDATE.request_fingerprint).toBeNull()
  })

  it('期限切れにした状態は再利用の対象から外れている', () => {
    expect(isReusable(EXPIRE_UPDATE.status)).toBe(false)
  })
})

describe('toFoundProject', () => {
  it('行が無ければ null', () => {
    expect(toFoundProject(null)).toBeNull()
    expect(toFoundProject(undefined)).toBeNull()
  })

  it('shops から contact_id を取り出す', () => {
    expect(toFoundProject(row('generated', 'contact-9'))).toEqual({
      id: 'project-1',
      status: 'generated',
      contactId: 'contact-9',
    })
  })

  it('shops が無ければ contactId は null', () => {
    expect(toFoundProject(row('email_failed', null))?.contactId).toBeNull()
  })

  it('クエリをすり抜けた expired の行も弾く', () => {
    expect(toFoundProject(row('expired'))).toBeNull()
  })
})

describe('findReusableProject', () => {
  it('fingerprint と status で絞り込む', async () => {
    const { client, filters } = fakeClient({
      row: { fingerprint: FINGERPRINT, value: row('generated') },
    })

    await findReusableProject(client, FINGERPRINT)

    expect(filters.table).toBe('menu_projects')
    expect(filters.eq.request_fingerprint).toBe(FINGERPRINT)
    expect(filters.in.status).toEqual([...REUSABLE_STATUSES])
  })

  it('生きている行を返す', async () => {
    const { client } = fakeClient({
      row: { fingerprint: FINGERPRINT, value: row('generated') },
    })

    const result = await findReusableProject(client, FINGERPRINT)

    expect(result.error).toBeNull()
    expect(result.project).toEqual({
      id: 'project-1',
      status: 'generated',
      contactId: 'contact-1',
    })
  })

  it('送信に失敗した行も再送のために返す', async () => {
    const { client } = fakeClient({
      row: { fingerprint: FINGERPRINT, value: row('email_failed') },
    })

    const result = await findReusableProject(client, FINGERPRINT)
    expect(result.project?.status).toBe('email_failed')
  })

  it('期限切れの行は返さない', async () => {
    const { client } = fakeClient({
      row: { fingerprint: FINGERPRINT, value: row('expired') },
    })

    const result = await findReusableProject(client, FINGERPRINT)

    expect(result.project).toBeNull()
    expect(result.error).toBeNull()
  })

  it('同じ入力でも fingerprint が違えば返さない', async () => {
    const { client } = fakeClient({
      row: { fingerprint: 'b'.repeat(64), value: row('generated') },
    })

    expect((await findReusableProject(client, FINGERPRINT)).project).toBeNull()
  })

  it('該当が無ければ null を返し、エラーにはしない', async () => {
    const { client } = fakeClient({})
    const result = await findReusableProject(client, FINGERPRINT)

    expect(result.project).toBeNull()
    expect(result.error).toBeNull()
  })

  it('クエリが失敗したら理由を返す', async () => {
    const { client } = fakeClient({ error: 'column does not exist' })
    const result = await findReusableProject(client, FINGERPRINT)

    expect(result.project).toBeNull()
    expect(result.error).toBe('column does not exist')
  })
})
