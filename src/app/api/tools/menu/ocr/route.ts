import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, ocrModel } from '@/lib/anthropic'
import { MissingApiKeyError } from '@/lib/errors'
import { extractMenu } from '@/lib/ocr-parse'
import {
  enforceRateLimit,
  ocrRules,
  rateLimitResponseInit,
  readClientIp,
} from '@/lib/rate-limit'
import { formatIssues, ocrRequestSchema } from '@/lib/validation'

const MAX_TOKENS = 8000

const PROMPT = `このメニュー表の画像を読み取ってください。
JSON形式に近い形で出力してください。途中で切れても構いません。
店名が読み取れる場合はshopNameに入れてください。
カテゴリ（セクション）ごとに品目をグループ化してください。
価格は数値（円）で入れてください。
品目名の中に改行がある場合はスペースに変換してください。

{
  "shopName": "店名（不明なら空文字）",
  "sections": [
    {
      "name_ja": "セクション名",
      "items": [
        {
          "name_ja": "品名",
          "price": 価格の数値
        }
      ]
    }
  ]
}`

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ocrRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', detail: formatIssues(parsed.error) },
      { status: 400 }
    )
  }

  const limit = await enforceRateLimit('ocr', ocrRules(readClientIp(req.headers)))
  if (!limit.ok) {
    const init = rateLimitResponseInit(limit)
    return NextResponse.json(init.body, { status: init.status, headers: init.headers })
  }

  const { imageBase64, mediaType } = parsed.data

  let responseText: string
  let truncated: boolean

  try {
    const anthropic = getAnthropic()
    const message = await anthropic.messages.create({
      model: ocrModel(),
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    responseText = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')

    // max_tokens で打ち切られた応答は JSON が閉じていない。
    // 復元して返せるので、ここでは失敗にせず印だけ付ける。
    truncated = message.stop_reason === 'max_tokens'
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      console.error('OCR: missing env', error.envName)
      return NextResponse.json({ error: 'OCR is not configured' }, { status: 503 })
    }
    console.error('OCR: upstream call failed:', error)
    return NextResponse.json({ error: 'OCR upstream failed' }, { status: 502 })
  }

  const result = extractMenu(responseText)
  if (!result.ok) {
    console.error('OCR: extraction failed', { reason: result.reason, truncated })
    return NextResponse.json(
      {
        error: 'Could not read the menu from this image',
        reason: result.reason,
        truncated,
      },
      { status: 422 }
    )
  }

  const { extraction } = result

  return NextResponse.json({
    content: extraction.content,
    shopName: extraction.shopName,
    // 品目が欠けている可能性をクライアントに伝える。
    truncated: truncated || extraction.salvaged,
    itemCount: extraction.itemCount,
  })
}
