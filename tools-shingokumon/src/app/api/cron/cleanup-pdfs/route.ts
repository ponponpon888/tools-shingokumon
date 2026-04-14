import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // 期限切れのmenu_projectsを取得
  const { data: expired } = await supabase
    .from('menu_projects')
    .select('id, assets(*)')
    .lt('expires_at', now)
    .neq('status', 'expired')
    .limit(100)

  if (!expired?.length) {
    return NextResponse.json({ deleted: 0 })
  }

  let deleted = 0

  for (const project of expired) {
    const assets = project.assets as { storage_path: string; storage_bucket: string }[]

    // Storageからファイル削除
    for (const asset of assets || []) {
      await supabase.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_path])
    }

    // ステータスをexpiredに更新
    await supabase
      .from('menu_projects')
      .update({ status: 'expired' })
      .eq('id', project.id)

    deleted++
  }

  return NextResponse.json({ deleted })
}
