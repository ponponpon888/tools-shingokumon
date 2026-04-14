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
    const {
      email,
      shopName,
      industry,
      industryOther,
      templateId,
      content,
      inputMode,
      selectedLanguages = ['en'],
    } = await req.json()

    // 1. 翻訳（選択言語のみ）
    const translations = await translateMenu(content, selectedLanguages)

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
        contact_id: (contact as { id: string }).id,
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
        shop_id: (shop as { id: string }).id,
        template_id: templateId,
        input_mode: inputMode,
        content_json: content,
        translations,
        selected_languages: selectedLanguages,
        status: 'generated',
        expires_at: expiresAt.toISOString(),
      } as never)
      .select()
      .single()

    if (menuError) throw menuError

    const projectId = (menuProject as { id: string }).id

    // 5. メール送信（Day 0）
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: `【完成】${shopName}様の多言語メニューが完成しました`,
      html: buildDay0Email(shopName, projectId, selectedLanguages),
    })

    // 6. message_event 記録
    await supabase.from('message_events').insert({
      contact_id: (contact as { id: string }).id,
      menu_project_id: projectId,
      channel: 'email',
      event_type: 'deliver_pdf',
      status: 'sent',
      provider: 'resend',
    } as never)

    return NextResponse.json({ menuProjectId: projectId })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  zh: '中文（简体字）',
  ko: '한국어',
}

async function translateMenu(
  content: MenuContent,
  selectedLanguages: string[]
): Promise<Record<string, unknown>> {
  const langList = selectedLanguages.map((l) => LANG_NAMES[l] ?? l).join('・')

  const prompt = `以下のメニューデータを${langList}に翻訳してください。
料理名・メニュー名は飲食・サービス業で一般的に使われる自然な表現にしてください。
セクション名も翻訳してください。

必ずJSON形式のみを返してください。マークダウンのコードブロックは不要です。

翻訳対象言語コード: ${selectedLanguages.join(', ')}
（en=英語, zh=中国語簡体字, ko=韓国語）

入力データ:
${JSON.stringify(content, null, 2)}

出力形式:
{
  "en": { "sections": [ { "name": "...", "items": [ { "name": "...", "price": 1000, "desc": "..." } ] } ] },
  "zh": { ... },
  "ko": { ... }
}

選択された言語のみ出力してください。`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    console.error('Translation parse error:', clean)
    return {}
  }
}

const LANG_LABEL_JA: Record<string, string> = {
  en: '英語',
  zh: '中国語',
  ko: '韓国語',
}

function buildDay0Email(
  shopName: string,
  menuProjectId: string,
  selectedLanguages: string[]
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'
  const langText = selectedLanguages.map((l) => LANG_LABEL_JA[l] ?? l).join('・')

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="background:#080808;color:#f0ece4;font-family:sans-serif;padding:40px 20px;max-width:600px;margin:0 auto;">
  <div style="border:1px solid rgba(201,168,76,0.15);padding:40px;">
    <div style="font-size:11px;letter-spacing:3px;color:rgba(201,168,76,0.5);margin-bottom:24px;">
      TOOLS.SHINGOKUMON.COM
    </div>
    <h1 style="font-size:20px;font-weight:300;color:#f0ece4;margin-bottom:12px;">
      ${shopName}様の多言語メニューが完成しました
    </h1>
    <p style="font-size:13px;color:rgba(240,236,228,0.5);line-height:1.9;margin-bottom:32px;">
      ご利用ありがとうございます。<br>
      ${langText}に対応したメニューが完成しました。<br>
      後からメニューの編集・改善も可能です。
    </p>
    <div style="border:1px solid rgba(201,168,76,0.15);padding:20px;margin-bottom:32px;text-align:center;">
      <a href="${appUrl}/menu/${menuProjectId}"
         style="display:inline-block;border:1px solid rgba(201,168,76,0.45);color:#c9a84c;padding:12px 32px;font-size:12px;letter-spacing:2px;text-decoration:none;">
        メニューを確認する
      </a>
    </div>
    <p style="font-size:11px;color:rgba(240,236,228,0.25);margin-top:40px;border-top:1px solid rgba(201,168,76,0.08);padding-top:20px;">
      このメールは tools.shingokumon.com からお送りしています。<br>
      配信停止をご希望の場合は <a href="${appUrl}/unsubscribe?id=${menuProjectId}" style="color:rgba(201,168,76,0.4);">こちら</a>
    </p>
  </div>
</body>
</html>`
}