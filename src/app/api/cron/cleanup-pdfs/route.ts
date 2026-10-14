import { NextRequest, NextResponse } from 'next/server'
import { EXPIRE_UPDATE } from '@/lib/menu-project'
import { createServiceClient } from '@/lib/supabase'

/** レート制限の記録を残す日数。最長のウィンドウ（1日）より十分長く取る。 */
const RATE_LIMIT_RETENTION_DAYS = 7

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('cleanup-pdfs: CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch (error) {
    console.error('cleanup-pdfs: supabase unavailable:', error)
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const now = new Date().toISOString()

  // 期限切れのmenu_projectsを取得
  const { data: expired, error: selectError } = await supabase
    .from('menu_projects')
    .select('id, assets(storage_path, storage_bucket)')
    .lt('expires_at', now)
    .neq('status', 'expired')
    .limit(100)

  if (selectError) {
    console.error('cleanup-pdfs: select failed:', selectError.message)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  let deleted = 0

  for (const project of expired ?? []) {
    // Storageからファイル削除
    for (const asset of project.assets) {
      const { error: removeError } = await supabase.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_path])

      if (removeError) {
        console.error('cleanup-pdfs: storage remove failed:', removeError.message)
      }
    }

    // ステータスをexpiredにし、request_fingerprint を外す。
    // 外さないと、同じ入力の再送でこの行が再利用され、見られない URL が送られる。
    const { error: updateError } = await supabase
      .from('menu_projects')
      .update(EXPIRE_UPDATE)
      .eq('id', project.id)

    if (updateError) {
      console.error('cleanup-pdfs: status update failed:', updateError.message)
      continue
    }

    deleted++
  }

  // レート制限の記録は放っておくと増え続けるので、同じ時間帯にまとめて消す。
  const cutoff = new Date(Date.now() - RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const { error: rateLimitError } = await supabase
    .from('rate_limit_events')
    .delete()
    .lt('created_at', cutoff.toISOString())

  if (rateLimitError) {
    console.error('cleanup-pdfs: rate limit cleanup failed:', rateLimitError.message)
  }

  return NextResponse.json({ deleted })
}
