import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ステップメールの定義
const STEP_SCHEDULE = [
  { step: 1, daysAfter: 3, eventType: 'nurture_1' },
  { step: 2, daysAfter: 7, eventType: 'nurture_2' },
  { step: 3, daysAfter: 14, eventType: 'nurture_3' },
  { step: 4, daysAfter: 30, eventType: 'nurture_4' },
]

export async function GET(req: NextRequest) {
  // Vercel Cronの認証
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  for (const schedule of STEP_SCHEDULE) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - schedule.daysAfter)

    // 対象者を取得（登録からN日経過 & このステップ未送信 & 配信停止でない）
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*, shops(*)')
      .eq('unsubscribed', false)
      .eq('current_nurture_step', schedule.step - 1)
      .lte('created_at', targetDate.toISOString())
      .limit(100)

    if (!contacts?.length) continue

    for (const contact of contacts) {
      try {
        const industry = (contact.shops as { industry?: string }[])?.[0]?.industry || ''
        const shopName = (contact.shops as { shop_name?: string }[])?.[0]?.shop_name || 'オーナー'

        const emailContent = buildStepEmail(schedule.step, shopName, industry)
        if (!emailContent) continue

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@shingokumon.com',
          to: contact.email,
          subject: emailContent.subject,
          html: emailContent.html,
        })

        // message_event記録
        await supabase.from('message_events').insert({
          contact_id: contact.id,
          channel: 'email',
          event_type: schedule.eventType as 'nurture_1' | 'nurture_2' | 'nurture_3' | 'nurture_4',
          status: 'sent',
          provider: 'resend',
        })

        // current_nurture_step更新
        await supabase
          .from('contacts')
          .update({
            current_nurture_step: schedule.step,
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', contact.id)

      } catch (err) {
        console.error(`Failed to send step ${schedule.step} to ${contact.email}:`, err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

function buildStepEmail(
  step: number,
  shopName: string,
  industry: string
): { subject: string; html: string } | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'

  if (step === 1) {
    return {
      subject: '外国人対応、メニューの次にやること',
      html: `<p>${shopName}様、先日はご利用ありがとうございました。メニューPDFの次のステップをご案内します。</p>
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
        html: `<p>${shopName}様、LINEで予約を24時間自動受付できるMUSUBUをご存知ですか？</p>
        <a href="https://shingokumon.com/musubu">MUSUBU 無料デモを見る →</a>`,
      }
    }
    if (isRyokan) {
      return {
        subject: '外国人ゲストの予約対応、できていますか？',
        html: `<p>${shopName}様、多言語対応の旅館PMSについてご案内します。</p>
        <a href="https://shingokumon.com">詳細を見る →</a>`,
      }
    }
    return {
      subject: '予約・問い合わせ対応、AIで自動化できます',
      html: `<p>${shopName}様、お店のLINE・お問い合わせをAIで自動化する方法をご案内します。</p>
      <a href="https://shingokumon.com">shingokumon.com →</a>`,
    }
  }

  if (step === 3) {
    return {
      subject: `【${industry || '業種別'}】お店のデジタル化、次の一手`,
      html: `<p>${shopName}様、無料相談を受け付けています。</p>
      <a href="https://shingokumon.com">無料相談を申し込む →</a>`,
    }
  }

  if (step === 4) {
    return {
      subject: 'メニューPDF、そろそろ季節メニューに更新しませんか？',
      html: `<p>${shopName}様、季節メニューの更新はお済みですか？無料でいつでも作り直せます。</p>
      <a href="${appUrl}/tools/menu">新しいメニューを作る →</a>`,
    }
  }

  return null
}
