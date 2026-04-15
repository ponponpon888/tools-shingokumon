import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
    try {
        const { question, menuText, lang, mode, quantity } = await req.json()

        if (!menuText) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        }

        // 注文フレーズモード
        if (mode === 'order') {
            const qty = quantity ?? 1
            const langMap: Record<string, string> = {
                en: 'English',
                zh: 'Chinese (Simplified)',
                ko: 'Korean',
            }
            const targetLang = langMap[lang] ?? 'English'

            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                messages: [
                    {
                        role: 'user',
                        content: `Generate a natural order phrase for a customer ordering ${qty} of "${menuText}" at a Japanese restaurant/shop.

Return ONLY a JSON object with exactly these two fields, no other text:
{
  "foreign": "order phrase in ${targetLang}",
  "japanese": "同じ意味の日本語フレーズ"
}

Rules:
- foreign: natural phrase in ${targetLang} mentioning quantity if more than 1
- japanese: natural Japanese phrase a customer would say to staff
- Keep both under 15 words
- No markdown, no explanation, just the JSON`,
                    },
                ],
            })

            const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
            try {
                const parsed = JSON.parse(text)
                return NextResponse.json(parsed)
            } catch {
                // フォールバックも選択言語に対応
                const fallbackMap: Record<string, { foreign: string; foreignPlural: string }> = {
                    zh: { foreign: '请给我这个。', foreignPlural: `请给我${qty}个这个。` },
                    ko: { foreign: '이것 주세요.', foreignPlural: `이것 ${qty}개 주세요.` },
                    en: { foreign: 'This one, please.', foreignPlural: `${qty} of this, please.` },
                }
                const fb = fallbackMap[lang] ?? fallbackMap['en']
                return NextResponse.json({
                    foreign: qty > 1 ? fb.foreignPlural : fb.foreign,
                    japanese: qty > 1 ? `これを${qty}つください` : 'これをください',
                })
            }
        }

        // 通常の質問モード
        if (!question) {
            return NextResponse.json({ error: 'Missing question' }, { status: 400 })
        }

        const langInstruction =
            lang === 'zh' ? 'Please answer in Chinese (Simplified).' :
                lang === 'ko' ? 'Please answer in Korean.' :
                    'Please answer in English.'

        const message = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: `You are a helpful restaurant/shop assistant. Answer the customer's question about the menu items below. Be concise (2-3 sentences max). ${langInstruction}

Menu:
${menuText}

Customer question: ${question}`,
                },
            ],
        })

        const answer = message.content[0].type === 'text' ? message.content[0].text : ''
        return NextResponse.json({ answer })
    } catch (err) {
        console.error('Chat API error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}