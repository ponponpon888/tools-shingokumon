/**
 * サーバーとクライアントで共有する上限・選択肢。
 * クライアントのバンドルに zod を持ち込まないよう、スキーマとは別ファイルにしている。
 */

/** OCR で受け付ける画像の MIME タイプ。 */
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number]

/**
 * base64 文字列の長さ上限。
 * Anthropic の画像は 1 枚あたり 5MB までで、base64 は約 4/3 に膨らむ。
 * 5MB * 4/3 ≒ 6,990,507 文字なので、余裕を見て 7,000,000 で切る。
 */
export const MAX_IMAGE_BASE64_LENGTH = 7_000_000

/** 画像ファイル自体のサイズ上限（バイト）。 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** 翻訳先として選べる言語。 */
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ko'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Step3Template のデザイン一覧と対応させる。 */
export const TEMPLATE_IDS = [
  'gold',
  'green',
  'red',
  'navy',
  'offwhite',
  'charcoal',
  'beige',
  'pink',
] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const MAX_SECTIONS = 50
export const MAX_ITEMS_PER_SECTION = 200
export const MAX_TOTAL_ITEMS = 500

/** 公開メニューの質問・注文フレーズ（/api/menu/chat）の入力上限。 */
export const MAX_CHAT_QUESTION_LENGTH = 500
export const MAX_CHAT_MENU_TEXT_LENGTH = 4000
export const MAX_CHAT_QUANTITY = 99

export function isAllowedMediaType(value: string): value is AllowedMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value)
}
