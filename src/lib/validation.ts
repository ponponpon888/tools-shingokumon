import { z } from 'zod'
import {
  ALLOWED_MEDIA_TYPES,
  MAX_CHAT_MENU_TEXT_LENGTH,
  MAX_CHAT_QUANTITY,
  MAX_CHAT_QUESTION_LENGTH,
  MAX_IMAGE_BASE64_LENGTH,
  MAX_ITEMS_PER_SECTION,
  MAX_SECTIONS,
  MAX_TOTAL_ITEMS,
  SUPPORTED_LANGUAGES,
  TEMPLATE_IDS,
  type SupportedLanguage,
} from '@/lib/limits'

export * from '@/lib/limits'

const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/

export const ocrRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(1, 'imageBase64 is required')
    .max(MAX_IMAGE_BASE64_LENGTH, 'image is too large')
    .regex(base64Pattern, 'imageBase64 must be base64 without a data URL prefix'),
  mediaType: z.enum(ALLOWED_MEDIA_TYPES).default('image/jpeg'),
})

export type OcrRequest = z.infer<typeof ocrRequestSchema>

const nameField = z.string().max(200).default('')

const menuItemSchema = z.object({
  name_ja: nameField,
  name_en: nameField,
  name_zh: nameField,
  name_ko: nameField,
  price: z.number().finite().min(0).max(10_000_000).default(0),
  currency: z.string().max(8).default('JPY'),
  tax_included: z.boolean().default(true),
})

const menuSectionSchema = z.object({
  name_ja: nameField,
  name_en: nameField,
  name_zh: nameField,
  name_ko: nameField,
  sort_order: z.number().int().min(0).max(MAX_SECTIONS).default(0),
  items: z.array(menuItemSchema).max(MAX_ITEMS_PER_SECTION),
})

export const menuContentSchema = z
  .object({
    sections: z.array(menuSectionSchema).min(1).max(MAX_SECTIONS),
  })
  .superRefine((content, ctx) => {
    const total = content.sections.reduce((sum, section) => sum + section.items.length, 0)
    if (total > MAX_TOTAL_ITEMS) {
      ctx.addIssue({
        code: 'custom',
        message: `too many items (max ${MAX_TOTAL_ITEMS})`,
        path: ['sections'],
      })
    }
  })

export const generateRequestSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase().trim()),
  shopName: z.string().trim().min(1, 'shopName is required').max(100),
  industry: z.string().trim().max(50).optional().default(''),
  industryOther: z.string().trim().max(100).optional().default(''),
  templateId: z.enum(TEMPLATE_IDS),
  inputMode: z.enum(['manual', 'image_ocr']),
  selectedLanguages: z
    .array(z.enum(SUPPORTED_LANGUAGES))
    .min(1, 'select at least one language')
    .max(SUPPORTED_LANGUAGES.length)
    // 重複を潰して順序を固定する。冪等性のフィンガープリントを安定させるため。
    .transform(
      (langs) => SUPPORTED_LANGUAGES.filter((lang) => langs.includes(lang)) as SupportedLanguage[]
    ),
  content: menuContentSchema,
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>

export const chatRequestSchema = z
  .object({
    question: z.string().trim().max(MAX_CHAT_QUESTION_LENGTH).optional(),
    menuText: z.string().trim().min(1, 'menuText is required').max(MAX_CHAT_MENU_TEXT_LENGTH),
    // 旧データの selected_languages に en/zh/ko 以外が入っていても落とさず、
    // 従来どおり英語にフォールバックする。
    lang: z.enum(SUPPORTED_LANGUAGES).catch('en').default('en'),
    mode: z.enum(['order', 'question']).catch('question').default('question'),
    quantity: z.number().int().min(1).max(MAX_CHAT_QUANTITY).catch(1).default(1),
  })
  .refine((value) => value.mode === 'order' || (value.question?.length ?? 0) > 0, {
    message: 'question is required',
    path: ['question'],
  })

export type ChatRequest = z.infer<typeof chatRequestSchema>

/** zod のエラーを、入力値を含めない短い文字列にまとめる。 */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}
