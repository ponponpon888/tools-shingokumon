import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  let payload: { email?: string; shopName?: string; menuProjectId?: string; industry?: string } = {}

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, shopName, menuProjectId, industry } = payload
  const supabase = createServiceClient()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'
  let sendError: unknown = null

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email.toLowerCase().trim(),
      subject: `【完成】${shopName}様の多言語メニュー + 次の一手`,
      html: buildEmailHtml(shopName || '', menuProjectId || null, industry || '', appUrl),
    })
    if (error) sendError = error
  } catch (e) {
    sendError = e
  }

  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (contact) {
      await supabase.from('message_events').insert({
        contact_id: contact.id,
        menu_project_id: menuProjectId || null,
        channel: 'email',
        event_type: 'deliver_pdf',
        status: sendError ? 'failed' : 'sent',
        provider: 'resend',
        error_message: sendError ? String(sendError) : null,
      })
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id)
    }
  } catch (dbErr) {
    console.error('DB record error:', dbErr)
  }

  if (sendError) {
    console.error('Send email error:', sendError)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

const INDUSTRY_CTA: Record<string, { label: string; href: string }> = {
  '美容・ネイル': { label: 'LINE予約を自動化する（MUSUBU）', href: 'https://shingokumon.com/musubu' },
  'エステ': { label: 'LINE予約を自動化する（MUSUBU）', href: 'https://shingokumon.com/musubu' },
  '旅館・ホテル': { label: '多言語対応PMSを見る（MotenasuOS）', href: 'https://shingokumon.com/motenasu' },
  '飲食・カフェ': { label: 'お店のLPをAIで作る', href: 'https://shingokumon.com' },
  '整骨院・整体': { label: 'AI自動応答を実装する', href: 'https://shingokumon.com' },
}

function buildEmailHtml(shopName: string, menuProjectId: string | null, industry: string, appUrl: string): string {
  const cta = INDUSTRY_CTA[industry] || { label: '無料相談を申し込む', href: 'https://shingokumon.com' }
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="background:#080808;color:#f0ece4;font-family:'Noto Sans JP',sans-serif;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="border:1px solid rgba(201,168,76,0.15);padding:40px;">
    <div style="font-size:10px;letter-spacing:3px;color:rgba(201,168,76,0.5);margin-bottom:24px;">TOOLS.SHINGOKUMON.COM</div>
    <h1 style="font-size:18px;font-weight:300;color:#f0ece4;margin-bottom:12px;line-height:1.5;">${shopName}様の<br>多言語メニューが完成しました</h1>
    <p style="font-size:13px;color:rgba(240,236,228,0.55);line-height:1.9;margin-bottom:28px;">英語・中国語・韓国語に対応したメニューが完成しました。<br>外国人のお客様に、そのまま見せられる状態です。</p>
    <div style="border:1px solid rgba(201,168,76,0.12);padding:20px;margin-bottom:32px;background:rgba(201,168,76,0.04);">
      <div style="font-size:10px;letter-spacing:2px;color:rgba(201,168,76,0.5);margin-bottom:10px;">次のステップ</div>
      <p style="font-size:13px;color:rgba(240,236,228,0.65);line-height:1.8;margin-bottom:16px;">多言語メニューができたら、次は予約・問い合わせ対応も整えましょう。</p>
      <a href="${cta.href}" style="display:inline-block;border:1px solid rgba(201,168,76,0.4);color:#c9a84c;font-size:12px;padding:12px 24px;text-decoration:none;letter-spacing:1px;">${cta.label} →</a>
    </div>
    <p style="font-size:11px;color:rgba(240,236,228,0.25);border-top:1px solid rgba(201,168,76,0.08);padding-top:20px;line-height:1.8;">
      このメールは tools.shingokumon.com からお送りしています。<br>
      ${menuProjectId ? `<a href="${appUrl}/unsubscribe?id=${menuProjectId}" style="color:rgba(201,168,76,0.3);">配信停止はこちら</a>` : ''}
    </p>
  </div>
</body>
</html>`
}