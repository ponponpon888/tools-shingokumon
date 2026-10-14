import Anthropic from '@anthropic-ai/sdk'
import { MissingApiKeyError } from '@/lib/errors'

/**
 * Anthropic クライアントはモジュール読み込み時ではなく、呼ばれたときに作る。
 * トップレベルで作ると、APIキーの無い環境（CI のビルドなど）で
 * ルートを読み込んだ瞬間に例外になる。
 */
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError('ANTHROPIC_API_KEY')
  }
  return new Anthropic({ apiKey })
}

/** OCR に使うモデル。既定は従来どおり。変更は環境変数で行う。 */
export function ocrModel(): string {
  return process.env.OCR_MODEL || 'claude-opus-4-5'
}

/** 翻訳に使うモデル。既定は従来どおり。 */
export function translationModel(): string {
  return process.env.TRANSLATION_MODEL || 'claude-haiku-4-5-20251001'
}
