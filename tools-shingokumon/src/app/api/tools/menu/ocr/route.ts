import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json()

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
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
              text: `このメニュー表の画像を読み取り、以下のJSON形式で返してください。
店名が読み取れる場合はshopNameに入れてください。
カテゴリ（セクション）ごとに品目をグループ化してください。
価格は数値（円）で入れてください。

必ずJSON形式のみを返してください。余計な説明文は不要です。

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
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // MenuContent形式に変換
    const content = {
      sections: parsed.sections.map((s: { name_ja: string; items: { name_ja: string; price: number }[] }, i: number) => ({
        name_ja: s.name_ja || 'メニュー',
        name_en: '',
        name_zh: '',
        name_ko: '',
        sort_order: i,
        items: s.items.map((item: { name_ja: string; price: number }) => ({
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
