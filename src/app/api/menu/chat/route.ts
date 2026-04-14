import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
    try {
        const { question, menuText, lang } = await req.json()

        if (!question || !menuText) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 })
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