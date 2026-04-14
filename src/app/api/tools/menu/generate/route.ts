import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'
import type { MenuContent } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { email, shopName, industry, industryOther, templateId, content, inputMode } = await req.json()

    // 1. 翻訳（Claude API）
    const translatedContent = await translateMenu(content, shopName)

    // 2. contact upsert
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source_tool_first: 'menu',
          consent_marketing: true,
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (contactError) throw contactError

    // 3. shop insert
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        contact_id: contact.id,
        shop_name: shopName,
        industry: industry || null,
        industry_other: industryOther || null,
      })
      .select()
      .single()

    if (shopError) throw shopError

    // 4. menu_project insert
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const { data: menuProject, error: menuError } = await supabase
      .from('menu_projects')
      .insert({
        shop_id: shop.id,
        template_id: templateId,
        input_mode: inputMode,
        content_json: translatedContent,
        status: 'generating',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (menuError) throw menuError

    // 5. PDF生成（非同期・別タスクとして処理）
    // TODO: PDF生成実装後に追加
    // 現在はメールのみ送信

    // 6. メール送信（Day 0 - PDF届け出し）
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@shingokumon.com',
      to: email,
      subject: `【完成】${shopName}様の多言語メニューPDFをお届けします`,
      html: buildDay0Email(shopName, menuProject.id),
    })

    // 7. message_event記録
    await supabase.from('message_events').insert({
      contact_id: contact.id,
      menu_project_id: menuProject.id,
      channel: 'email',
      event_type: 'deliver_pdf',
      status: 'sent',
      provider: 'resend',
    })

    // 8. menu_projectのstatus更新
    await supabase
      .from('menu_projects')
      .update({ status: 'generated' })
      .eq('id', menuProject.id)

    return NextResponse.json({ menuProjectId: menuProject.id })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

async function translateMenu(content: MenuContent, shopName: string): Promise<MenuContent> {
  const prompt = `以下のメニューデータを英語・中国語（簡体字）・韓国語に翻訳してください。
料理名・メニュー名は飲食・サービス業で一般的に使われる自然な表現にしてください。
セクション名も翻訳してください。

必ずJSON形式のみを返してください。

入力:
${JSON.stringify(content, null, 2)}

出力形式（同じ構造でname_en, name_zh, name_koを埋めた完全なJSON）:`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function buildDay0Email(shopName: string, menuProjectId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="background:#080808;color:#f0ece4;font-family:sans-serif;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="border:1px solid rgba(201,168,76,0.15);padding:40px;">
    <div style="font-size:11px;letter-spacing:3px;color:rgba(201,168,76,0.5);margin-bottom:24px;">
      TOOLS.SHINGOKUMON.COM
    </div>
    <h1 style="font-size:20px;font-weight:300;color:#f0ece4;margin-bottom:12px;">
      ${shopName}様の多言語メニューPDFが完成しました
    </h1>
    <p style="font-size:13px;color:rgba(240,236,228,0.5);line-height:1.9;margin-bottom:32px;">
      ご利用ありがとうございます。<br>
      英語・中国語・韓国語に対応したメニューPDFが完成しました。<br>
      印刷してそのままご使用いただけます。
    </p>

    <div style="border:1px solid rgba(201,168,76,0.15);padding:20px;margin-bottom:32px;text-align:center;">
      <p style="font-size:11px;color:rgba(240,236,228,0.4);margin-bottom:12px;">
        ※ PDF生成機能は現在実装中です。<br>近日中にダウンロードリンクをお届けします。
      </p>
    </div>

    <p style="font-size:11px;color:rgba(240,236,228,0.25);margin-top:40px;border-top:1px solid rgba(201,168,76,0.08);padding-top:20px;">
      このメールは tools.shingokumon.com からお送りしています。<br>
      配信停止をご希望の場合は <a href="${appUrl}/unsubscribe?id=${menuProjectId}" style="color:rgba(201,168,76,0.4);">こちら</a>
    </p>
  </div>
</body>
</html>`
}
