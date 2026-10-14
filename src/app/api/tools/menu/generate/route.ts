import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, translationModel } from '@/lib/anthropic'
import { buildDay0Email } from '@/lib/day0-email'
import { MissingApiKeyError } from '@/lib/errors'
import { fingerprint } from '@/lib/fingerprint'
import { findReusableProject, type Client } from '@/lib/menu-project'
import {
  enforceRateLimit,
  generateRules,
  rateLimitResponseInit,
  readClientIp,
} from '@/lib/rate-limit'
import { getResend, fromAddress } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase'
import { formatIssues, generateRequestSchema } from '@/lib/validation'
import type { Database, MenuContent, MenuStatus } from '@/types/database'

const EXPIRY_DAYS = 90
/** PostgreSQL の unique 制約違反。 */
const UNIQUE_VIOLATION = '23505'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = generateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', detail: formatIssues(parsed.error) },
      { status: 400 }
    )
  }

  const input = parsed.data
  // 正規化後の値からハッシュを取る。キー順や言語の並びに左右されない。
  const requestFingerprint = fingerprint(input)

  let supabase: Client
  try {
    supabase = createServiceClient()
  } catch (error) {
    console.error('Generate: supabase unavailable:', error)
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 503 })
  }

  // 1. 同じ入力が既に処理済みなら、翻訳も課金も発生させずに返す。
  //    期限切れの行は対象外。再利用すると見られない URL を送ることになる。
  const lookup = await findReusableProject(supabase, requestFingerprint)
  if (lookup.error) {
    console.error('Generate: fingerprint lookup failed:', lookup.error)
    return NextResponse.json({ error: 'Storage is unavailable' }, { status: 503 })
  }

  if (lookup.project) {
    // メールが送れている場合は、何もせず同じ ID を返す（二重作成しない）。
    if (lookup.project.status === 'generated') {
      return NextResponse.json({
        menuProjectId: lookup.project.id,
        emailSent: true,
        reused: true,
      })
    }

    // 送信に失敗して残っている場合だけ、レート制限を通してから再送する。
    const retryLimit = await enforceRateLimit(
      'generate',
      generateRules(readClientIp(req.headers), input.email)
    )
    if (!retryLimit.ok) {
      const init = rateLimitResponseInit(retryLimit)
      return NextResponse.json(init.body, { status: init.status, headers: init.headers })
    }

    const resent = await deliverAndRecord(supabase, {
      projectId: lookup.project.id,
      contactId: lookup.project.contactId,
      email: input.email,
      shopName: input.shopName,
      selectedLanguages: input.selectedLanguages,
    })

    return NextResponse.json({
      menuProjectId: lookup.project.id,
      emailSent: resent,
      reused: true,
    })
  }

  // 2. レート制限。ここを通らないと Anthropic / Resend は呼ばない。
  const limit = await enforceRateLimit(
    'generate',
    generateRules(readClientIp(req.headers), input.email)
  )
  if (!limit.ok) {
    const init = rateLimitResponseInit(limit)
    return NextResponse.json(init.body, { status: init.status, headers: init.headers })
  }

  // 3. 翻訳。失敗した時点で返すので、DB には何も書かれない。
  let translations: Record<string, unknown>
  try {
    translations = await translateMenu(input.content, input.selectedLanguages)
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      console.error('Generate: missing env', error.envName)
      return NextResponse.json({ error: 'Translation is not configured' }, { status: 503 })
    }
    console.error('Generate: translation failed:', error)
    return NextResponse.json({ error: 'Translation upstream failed' }, { status: 502 })
  }

  // 翻訳には数秒かかる。その間に同じ入力が走り切っていないか、書く直前にもう一度見る。
  const recheck = await findReusableProject(supabase, requestFingerprint)
  if (recheck.project) {
    return NextResponse.json({
      menuProjectId: recheck.project.id,
      emailSent: recheck.project.status === 'generated',
      reused: true,
    })
  }

  // 4. contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert(
      {
        email: input.email,
        source_tool_first: 'menu',
        consent_marketing: true,
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (contactError || !contact) {
    console.error('Generate: contact upsert failed:', contactError)
    return NextResponse.json({ error: 'Could not save your contact' }, { status: 500 })
  }

  // 5. shop
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .insert({
      contact_id: contact.id,
      shop_name: input.shopName,
      industry: input.industry || null,
      industry_other: input.industryOther || null,
    })
    .select('id')
    .single()

  if (shopError || !shop) {
    console.error('Generate: shop insert failed:', shopError)
    return NextResponse.json({ error: 'Could not save your shop' }, { status: 500 })
  }

  // 6. menu_project
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS)

  const { data: menuProject, error: menuError } = await supabase
    .from('menu_projects')
    .insert({
      shop_id: shop.id,
      template_id: input.templateId,
      input_mode: input.inputMode,
      content_json: input.content,
      translations: translations as Database['public']['Tables']['menu_projects']['Insert']['translations'],
      selected_languages: input.selectedLanguages,
      request_fingerprint: requestFingerprint,
      status: 'email_pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (menuError || !menuProject) {
    // 同時に同じ入力が来た場合は unique 制約で弾かれる。先に入った行を返す。
    if (menuError?.code === UNIQUE_VIOLATION) {
      const raced = await findReusableProject(supabase, requestFingerprint)
      if (raced.project) {
        return NextResponse.json({
          menuProjectId: raced.project.id,
          emailSent: raced.project.status === 'generated',
          reused: true,
        })
      }
    }
    console.error('Generate: menu_project insert failed:', menuError)
    return NextResponse.json({ error: 'Could not save your menu' }, { status: 500 })
  }

  // 7. メール送信。失敗しても status に残して 200 を返す（行だけ残って 500 にしない）。
  const emailSent = await deliverAndRecord(supabase, {
    projectId: menuProject.id,
    contactId: contact.id,
    email: input.email,
    shopName: input.shopName,
    selectedLanguages: input.selectedLanguages,
  })

  return NextResponse.json({
    menuProjectId: menuProject.id,
    emailSent,
    reused: false,
  })
}

/**
 * 完成メールを送り、結果を menu_projects.status と message_events に残す。
 * 送れたかどうかだけを返す。例外は投げない。
 */
async function deliverAndRecord(
  supabase: Client,
  args: {
    projectId: string
    contactId: string | null
    email: string
    shopName: string
    selectedLanguages: string[]
  }
): Promise<boolean> {
  const { subject, html } = buildDay0Email({
    shopName: args.shopName,
    menuProjectId: args.projectId,
    selectedLanguages: args.selectedLanguages,
  })

  let providerMessageId: string | null = null
  let failure: string | null = null

  try {
    const { data, error } = await getResend().emails.send({
      from: fromAddress(),
      to: args.email,
      subject,
      html,
    })
    if (error) {
      failure = error.message
    } else {
      providerMessageId = data?.id ?? null
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'unknown send error'
  }

  const status: MenuStatus = failure ? 'email_failed' : 'generated'

  const { error: statusError } = await supabase
    .from('menu_projects')
    .update({ status })
    .eq('id', args.projectId)

  if (statusError) {
    console.error('Generate: status update failed:', statusError.message)
  }

  const { error: eventError } = await supabase.from('message_events').insert({
    contact_id: args.contactId,
    menu_project_id: args.projectId,
    channel: 'email',
    event_type: 'deliver_pdf',
    status: failure ? 'failed' : 'sent',
    provider: 'resend',
    provider_message_id: providerMessageId,
    error_message: failure,
  })

  if (eventError) {
    console.error('Generate: message_event insert failed:', eventError.message)
  }

  if (failure) {
    console.error('Generate: email send failed:', failure)
  }

  return failure === null
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
  const langList = selectedLanguages.map((lang) => LANG_NAMES[lang] ?? lang).join('・')

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

  const message = await getAnthropic().messages.create({
    model: translationModel(),
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed: unknown = JSON.parse(clean)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // 翻訳が壊れていても、メニュー自体は日本語で成立する。空で進める。
  }

  console.error('Generate: translation response was not usable JSON')
  return {}
}
