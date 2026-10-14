import type { MenuContent } from '@/types/database'

export type OcrFailureReason =
  /** 応答に JSON らしき塊が無かった。 */
  | 'no_json'
  /** JSON が壊れていて、1 品目も救出できなかった。 */
  | 'unparsable'

export type OcrExtraction = {
  shopName: string
  content: MenuContent
  itemCount: number
  /** 途中で切れた応答から復元したか。 */
  salvaged: boolean
}

export type OcrExtractionResult =
  | { ok: true; extraction: OcrExtraction }
  | { ok: false; reason: OcrFailureReason }

type RawItem = { name_ja?: unknown; price?: unknown }
type RawSection = { name_ja?: unknown; items?: unknown }
type RawMenu = { shopName?: unknown; sections?: unknown }

/**
 * モデルの応答テキストからメニューを取り出す。
 *
 * 応答が max_tokens で切れることが普通にあるため、
 * 「そのままパース」→「切れた末尾を復元してパース」の 2 段で処理する。
 */
export function extractMenu(rawText: string): OcrExtractionResult {
  const block = findJsonBlock(rawText)
  if (!block) {
    return { ok: false, reason: 'no_json' }
  }

  const sanitized = sanitize(block)

  const direct = tryParse(sanitized)
  if (direct) {
    return { ok: true, extraction: normalize(direct, false) }
  }

  const repaired = repairTruncated(sanitized)
  if (repaired) {
    const extraction = normalize(repaired, true)
    // 救出できても中身が空なら、失敗として扱う。
    if (extraction.itemCount === 0 && extraction.content.sections.length === 0) {
      return { ok: false, reason: 'unparsable' }
    }
    return { ok: true, extraction }
  }

  return { ok: false, reason: 'unparsable' }
}

/** 最初の `{` から最後の `}` までを取る。無ければ、切れた応答として `{` 以降を取る。 */
export function findJsonBlock(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  const end = text.lastIndexOf('}')
  if (end > start) {
    return text.slice(start, end + 1)
  }
  // 閉じ括弧が来る前に切れている場合も、復元の対象にする。
  return text.slice(start)
}

/** 改行・タブを空白にし、連続する空白を 1 つにまとめる。 */
function sanitize(text: string): string {
  return text.replace(/[\n\r\t]/g, ' ').replace(/ +/g, ' ')
}

function tryParse(text: string): RawMenu | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RawMenu
    }
    return null
  } catch {
    return null
  }
}

/**
 * 途中で切れた JSON を復元する。
 *
 * 文字列リテラルの外側にある閉じ括弧の位置と、そこでの括弧スタックを記録し、
 * 後ろから順に「そこで切って残りを閉じる」を試す。
 * 最後まで完結している要素だけが残るので、欠けるのは末尾の壊れた 1 件だけになる。
 */
export function repairTruncated(text: string): RawMenu | null {
  const checkpoints: { index: number; open: string[] }[] = []
  const open: string[] = []
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
    } else if (ch === '{' || ch === '[') {
      open.push(ch)
    } else if (ch === '}' || ch === ']') {
      open.pop()
      checkpoints.push({ index: i, open: [...open] })
    }
  }

  for (let i = checkpoints.length - 1; i >= 0; i--) {
    const { index, open: remaining } = checkpoints[i]
    const closers = remaining
      .slice()
      .reverse()
      .map((bracket) => (bracket === '{' ? '}' : ']'))
      .join('')

    const parsed = tryParse(text.slice(0, index + 1) + closers)
    if (parsed) return parsed
  }

  return null
}

function normalize(raw: RawMenu, salvaged: boolean): OcrExtraction {
  const rawSections = Array.isArray(raw.sections) ? (raw.sections as RawSection[]) : []

  const sections = rawSections
    .filter((section): section is RawSection => section !== null && typeof section === 'object')
    .map((section, index) => {
      const rawItems = Array.isArray(section.items) ? (section.items as RawItem[]) : []
      return {
        name_ja: asText(section.name_ja) || 'メニュー',
        name_en: '',
        name_zh: '',
        name_ko: '',
        sort_order: index,
        items: rawItems
          .filter((item): item is RawItem => item !== null && typeof item === 'object')
          .map((item) => ({
            name_ja: asText(item.name_ja),
            name_en: '',
            name_zh: '',
            name_ko: '',
            price: asPrice(item.price),
            currency: 'JPY',
            tax_included: true,
          }))
          // 名前が取れなかった品目は捨てる（切れた末尾に出やすい）。
          .filter((item) => item.name_ja.length > 0),
      }
    })

  const content: MenuContent = { sections }
  const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0)

  return {
    shopName: asText(raw.shopName),
    content,
    itemCount,
    salvaged,
  }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asPrice(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.min(num, 10_000_000)
}
