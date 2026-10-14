import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, MenuStatus } from '@/types/database'

export type Client = SupabaseClient<Database>

/**
 * 同じ入力の再送で再利用してよい状態。
 *
 * expired を入れてはいけない。期限切れの行を再利用すると、
 * 見られない URL をメールで送ったうえに status が generated に戻り、
 * cron が翌日また expired にする、という往復になる。
 */
export const REUSABLE_STATUSES = [
  'generated',
  'email_pending',
  'email_failed',
] as const satisfies readonly MenuStatus[]

/**
 * 期限切れにするときの更新内容。
 *
 * request_fingerprint を外すのが要点。部分ユニークインデックスは NULL を無視するので、
 * 同じ入力がまた来たときは再利用ではなく新しい行として作り直される。
 */
export const EXPIRE_UPDATE = {
  status: 'expired',
  request_fingerprint: null,
} as const satisfies Database['public']['Tables']['menu_projects']['Update']

export type FoundProject = {
  id: string
  status: MenuStatus
  contactId: string | null
}

export type FingerprintRow = {
  id: string
  status: MenuStatus
  shops: { contact_id: string | null } | null
}

export function isReusable(status: MenuStatus): boolean {
  return (REUSABLE_STATUSES as readonly MenuStatus[]).includes(status)
}

/**
 * 取得した行を再利用の対象に変換する。
 * クエリ側でも状態を絞っているが、ここでももう一度確認する。
 */
export function toFoundProject(row: FingerprintRow | null | undefined): FoundProject | null {
  if (!row) return null
  if (!isReusable(row.status)) return null

  return {
    id: row.id,
    status: row.status,
    contactId: row.shops?.contact_id ?? null,
  }
}

/** 同じ入力で作られた、まだ生きている行を探す。 */
export async function findReusableProject(
  supabase: Client,
  requestFingerprint: string
): Promise<{ project: FoundProject | null; error: string | null }> {
  const { data, error } = await supabase
    .from('menu_projects')
    .select('id, status, shops(contact_id)')
    .eq('request_fingerprint', requestFingerprint)
    .in('status', [...REUSABLE_STATUSES])
    .limit(1)
    .maybeSingle()

  if (error) {
    return { project: null, error: error.message }
  }

  return { project: toFoundProject(data as FingerprintRow | null), error: null }
}
