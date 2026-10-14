import { Resend } from 'resend'
import { MissingApiKeyError } from '@/lib/errors'

/**
 * Resend クライアントも呼ばれたときに作る。
 * トップレベルで作ると、APIキーの無い環境でルートの読み込みが失敗する。
 */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError('RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

export function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
}
