import { NextRequest, NextResponse } from 'next/server'
import { MissingApiKeyError } from '@/lib/errors'
import { fromAddress, getResend } from '@/lib/resend'

export async function POST(request: NextRequest) {
    let resend: ReturnType<typeof getResend>
    try {
        resend = getResend()
    } catch (error) {
        if (error instanceof MissingApiKeyError) {
            console.error('send-email: missing env', error.envName)
            return NextResponse.json({ error: 'Not configured' }, { status: 503 })
        }
        throw error
    }

    try {
        const { to, subject, html } = await request.json()

        if (!to || !subject || !html) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const { data, error } = await resend.emails.send({
            from: fromAddress(),
            to,
            subject,
            html,
        })

        if (error) {
            return NextResponse.json({ error }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}