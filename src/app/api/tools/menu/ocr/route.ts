import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json()

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `このメニュー表の画像を読み取ってください。
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
}`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('OCR: JSON not found. Raw text (first 300):', text.slice(0, 300))
      throw new Error('JSON extraction failed')
    }

    // サニタイズ：改行・タブ・連続スペースを除去
    const sanitized = match[0]
      .replace(/[\n\r\t]/g, ' ')
      .replace(/ +/g, ' ')

    // salvage処理：パース失敗時に末尾の不完全部分を除去して再試行
    const parsed = safeParse(sanitized)
    if (!parsed) {
      console.error('OCR: salvage failed. Sanitized (first 300):', sanitized.slice(0, 300))
      throw new Error('JSON parse failed')
    }

    const content = {
      sections: (parsed.sections || []).map((s: { name_ja?: string; items?: { name_ja?: string; price?: number }[] }, i: number) => ({
        name_ja: s.name_ja || 'メニュー',
        name_en: '',
        name_zh: '',
        name_ko: '',
        sort_order: i,
        items: (s.items || []).map((item: { name_ja?: string; price?: number }) => ({
          name_ja: item.name_ja || '',
          name_en: '',
          name_zh: '',
          name_ko: '',
          price: Number(item.price) || 0,
          currency: 'JPY',
          tax_included: true,
        })),
      })),
    }

    return NextResponse.json({ content, shopName: parsed.shopName || '' })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 })
  }
}

// salvage：パース失敗時に末尾の不完全な部分を除去して再試行
function safeParse(text: string): Record<string, unknown> | null {
  // 試行1：そのままパース
  try {
    return JSON.parse(text)
  } catch { /* fall through */ }

  // 試行2：末尾の不完全なプロパティを除去
  try {
    const trimmed = text.replace(/,\s*[^,}\]]*$/, '')
    const closed = trimmed + '}]}'
    return JSON.parse(closed)
  } catch { /* fall through */ }

  // 試行3：sectionsだけ救出
  try {
    const sectionsMatch = text.match(/"sections"\s*:\s*\[[\s\S]*/)
    if (sectionsMatch) {
      return { shopName: '', sections: [] }
    }
  } catch { /* fall through */ }

  return null
}