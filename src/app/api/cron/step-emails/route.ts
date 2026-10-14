import { NextRequest, NextResponse } from 'next/server'
import { MissingApiKeyError } from '@/lib/errors'
import { escapeHtml } from '@/lib/html'
import { fromAddress, getResend } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase'
import type { EventType } from '@/types/database'

// ステップメールの定義
const STEP_SCHEDULE: { step: number; daysAfter: number; eventType: EventType }[] = [
  { step: 1, daysAfter: 3, eventType: 'nurture_1' },
  { step: 2, daysAfter: 7, eventType: 'nurture_2' },
  { step: 3, daysAfter: 14, eventType: 'nurture_3' },
  { step: 4, daysAfter: 30, eventType: 'nurture_4' },
]

export async function GET(req: NextRequest) {
  // Vercel Cronの認証
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('step-emails: CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let resend: ReturnType<typeof getResend>
  try {
    resend = getResend()
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      console.error('step-emails: missing env', error.envName)
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    throw error
  }

  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch (error) {
    console.error('step-emails: supabase unavailable:', error)
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  let sent = 0

  for (const schedule of STEP_SCHEDULE) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - schedule.daysAfter)

    // 対象者を取得（統合テーブルから取得）
    const { data: contacts, error: selectError } = await supabase
      .from('inbound_contacts')
      .select('id, email, name, company, meta')
      .eq('contact_type', 'business_lead')
      .in('status', ['new', 'contacted'])
      .lte('created_at', targetDate.toISOString())
      .limit(100)

    if (selectError) {
      console.error('step-emails: select failed:', selectError.message)
      continue
    }
    if (!contacts?.length) continue

    for (const contact of contacts) {
      try {
        // メタデータから業種情報を取得
        const industry = contact.meta?.industry || ''
        const shopName = contact.company || contact.name || 'オーナー'

        const emailContent = buildStepEmail(schedule.step, shopName, industry)
        if (!emailContent) continue

        const { error: sendError } = await resend.emails.send({
          from: fromAddress(),
          to: contact.email,
          subject: emailContent.subject,
          html: emailContent.html,
        })

        if (sendError) {
          console.error(`step-emails: send failed for step ${schedule.step}:`, sendError.message)
          continue
        }
        sent++

        const { error: eventError } = await supabase.from('message_events').insert({
          contact_id: contact.id,
          channel: 'email',
          event_type: schedule.eventType,
          status: 'sent',
          provider: 'resend',
        })

        if (eventError) {
          console.error('step-emails: message_event insert failed:', eventError.message)
        }

        // status更新
        const { error: updateError } = await supabase
          .from('inbound_contacts')
          .update({
            status: 'contacted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contact.id)

        if (updateError) {
          console.error('step-emails: status update failed:', updateError.message)
        }
      } catch (err) {
        console.error(`step-emails: step ${schedule.step} failed for one contact:`, err)
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}

/** 件名に改行や制御文字を持ち込ませない。 */
function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n\t\u0000-\u001f\u007f]/g, ' ').trim()
}

function buildStepEmail(
  step: number,
  shopName: string,
  industry: string
): { subject: string; html: string } | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'
  // 店名・業種は DB 由来の自由入力なので、HTML に入れる前にエスケープする。
  const safeShopName = escapeHtml(shopName)

  if (step === 1) {
    return {
      subject: '外国人対応、メニューの次にやること',
      html: `<p>${safeShopName}様、先日はご利用ありがとうございました。メニューPDFの次のステップをご案内します。</p>
      <p>Googleマップでの多言語対応・口コミ返信が重要です。</p>
      <a href="${appUrl}/tools/review">口コミ返信AIを試す（無料）→</a>`,
    }
  }

  if (step === 2) {
    // 業種別
    const isSalon = ['美容・ネイル', 'エステ'].includes(industry)
    const isRyokan = industry === '旅館・ホテル'

    if (isSalon) {
      return {
        subject: '予約、まだ手動で管理していますか？',
        html: `<p>${safeShopName}様、LINEで予約を24時間自動受付できるMUSUBUをご存知ですか？</p>
        <a href="https://shingokumon.com/musubu">MUSUBU 無料デモを見る →</a>`,
      }
    }
    if (isRyokan) {
      return {
        subject: '外国人ゲストの予約対応、できていますか？',
        html: `<p>${safeShopName}様、多言語対応の旅館PMSについてご案内します。</p>
        <a href="https://shingokumon.com">詳細を見る →</a>`,
      }
    }
    return {
      subject: '予約・問い合わせ対応、AIで自動化できます',
      html: `<p>${safeShopName}様、お店のLINE・お問い合わせをAIで自動化する方法をご案内します。</p>
      <a href="https://shingokumon.com">shingokumon.com →</a>`,
    }
  }

  if (step === 3) {
    return {
      subject: sanitizeSubject(`【${industry || '業種別'}】お店のデジタル化、次の一手`),
      html: `<p>${safeShopName}様、無料相談を受け付けています。</p>
      <a href="https://shingokumon.com">無料相談を申し込む →</a>`,
    }
  }

  if (step === 4) {
    return {
      subject: 'メニューPDF、そろそろ季節メニューに更新しませんか？',
      html: `<p>${safeShopName}様、季節メニューの更新はお済みですか？無料でいつでも作り直せます。</p>
      <a href="${appUrl}/tools/menu">新しいメニューを作る →</a>`,
    }
  }

  return null
}
