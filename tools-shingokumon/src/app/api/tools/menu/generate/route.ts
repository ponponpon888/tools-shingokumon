import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import type { MenuContent } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  try {
    const body = await req.json()
    const { email, shopName, industry, industryOther, templateId, content, inputMode } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!shopName) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 })
    }

    const translatedContent = await translateMenu(content)

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

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const { data: menuProject, error: menuError } = await supabase
      .from('menu_projects')
      .insert({
        shop_id: shop.id,
        template_id: templateId,
        input_mode: inputMode,
        content_json: translatedContent,
        status: 'generated',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (menuError) throw menuError

    return NextResponse.json({
      menuProjectId: menuProject.id,
      content: translatedContent,
      shopName,
      templateId,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

async function translateMenu(content: MenuContent): Promise<MenuContent> {
  const prompt = `以下のメニューデータを英語・中国語（簡体字）・韓国語に翻訳してください。
料理名・メニュー名はサービス業で一般的に使われる自然な表現にしてください。
セクション名も翻訳してください。

必ずJSON形式のみを返してください。余計な説明文・コードブロック記号は不要です。

入力:
${JSON.stringify(content, null, 2)}

出力形式（同じ構造でname_en, name_zh, name_koを埋めた完全なJSON）:`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('JSON not found. Raw text (first 300):', text.slice(0, 300))
    throw new Error('JSON extraction failed')
  }

  try {
    return JSON.parse(match[0])
  } catch {
    console.error('JSON parse failed. Extracted (first 300):', match[0].slice(0, 300))
    throw new Error('JSON parse failed')
  }
}