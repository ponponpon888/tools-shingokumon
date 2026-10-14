import { describe, expect, it } from 'vitest'
import {
  MAX_CHAT_MENU_TEXT_LENGTH,
  MAX_CHAT_QUESTION_LENGTH,
  MAX_IMAGE_BASE64_LENGTH,
  MAX_TOTAL_ITEMS,
} from '@/lib/limits'
import { chatRequestSchema, generateRequestSchema, ocrRequestSchema } from '@/lib/validation'

const item = {
  name_ja: '唐揚げ',
  name_en: '',
  name_zh: '',
  name_ko: '',
  price: 680,
  currency: 'JPY',
  tax_included: true,
}

const validGenerate = {
  email: 'Owner@Example.Test',
  shopName: '山田屋',
  industry: '飲食・カフェ',
  industryOther: '',
  templateId: 'gold',
  inputMode: 'image_ocr',
  selectedLanguages: ['ko', 'en'],
  content: {
    sections: [
      { name_ja: 'FOOD', name_en: '', name_zh: '', name_ko: '', sort_order: 0, items: [item] },
    ],
  },
}

describe('ocrRequestSchema', () => {
  it('jpeg / png / webp を受け付ける', () => {
    for (const mediaType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(ocrRequestSchema.safeParse({ imageBase64: 'aGVsbG8=', mediaType }).success).toBe(true)
    }
  })

  it('それ以外の MIME タイプを拒否する', () => {
    for (const mediaType of ['image/gif', 'image/heic', 'image/svg+xml', 'application/pdf']) {
      expect(ocrRequestSchema.safeParse({ imageBase64: 'aGVsbG8=', mediaType }).success).toBe(false)
    }
  })

  it('mediaType 未指定なら jpeg にする', () => {
    const parsed = ocrRequestSchema.parse({ imageBase64: 'aGVsbG8=' })
    expect(parsed.mediaType).toBe('image/jpeg')
  })

  it('data URL の接頭辞付きを拒否する', () => {
    const result = ocrRequestSchema.safeParse({
      imageBase64: 'data:image/png;base64,aGVsbG8=',
      mediaType: 'image/png',
    })
    expect(result.success).toBe(false)
  })

  it('base64 として不正な文字を拒否する', () => {
    expect(ocrRequestSchema.safeParse({ imageBase64: 'not base64!' }).success).toBe(false)
  })

  it('空文字を拒否する', () => {
    expect(ocrRequestSchema.safeParse({ imageBase64: '' }).success).toBe(false)
  })

  it('長さの上限を超えたら拒否する', () => {
    const tooLong = 'a'.repeat(MAX_IMAGE_BASE64_LENGTH + 1)
    expect(ocrRequestSchema.safeParse({ imageBase64: tooLong }).success).toBe(false)
  })

  it('上限ちょうどは通す', () => {
    const exact = 'a'.repeat(MAX_IMAGE_BASE64_LENGTH)
    expect(ocrRequestSchema.safeParse({ imageBase64: exact }).success).toBe(true)
  })
})

describe('generateRequestSchema', () => {
  it('正常な入力を通す', () => {
    expect(generateRequestSchema.safeParse(validGenerate).success).toBe(true)
  })

  it('メールを小文字に正規化する', () => {
    const parsed = generateRequestSchema.parse(validGenerate)
    expect(parsed.email).toBe('owner@example.test')
  })

  it('メール形式でないものを拒否する', () => {
    for (const email of ['owner', 'owner@', '@example.test', 'owner example.test', '']) {
      expect(generateRequestSchema.safeParse({ ...validGenerate, email }).success).toBe(false)
    }
  })

  it('店名が空なら拒否する', () => {
    expect(generateRequestSchema.safeParse({ ...validGenerate, shopName: '   ' }).success).toBe(
      false
    )
  })

  it('店名が長すぎれば拒否する', () => {
    const shopName = 'あ'.repeat(101)
    expect(generateRequestSchema.safeParse({ ...validGenerate, shopName }).success).toBe(false)
  })

  it('対応していない言語を拒否する', () => {
    expect(
      generateRequestSchema.safeParse({ ...validGenerate, selectedLanguages: ['en', 'fr'] }).success
    ).toBe(false)
  })

  it('言語が空なら拒否する', () => {
    expect(
      generateRequestSchema.safeParse({ ...validGenerate, selectedLanguages: [] }).success
    ).toBe(false)
  })

  it('言語の重複を潰し、順序を固定する', () => {
    const parsed = generateRequestSchema.parse({
      ...validGenerate,
      selectedLanguages: ['ko', 'en', 'ko'],
    })
    expect(parsed.selectedLanguages).toEqual(['en', 'ko'])
  })

  it('知らない templateId を拒否する', () => {
    expect(
      generateRequestSchema.safeParse({ ...validGenerate, templateId: 'rainbow' }).success
    ).toBe(false)
  })

  it('知らない inputMode を拒否する', () => {
    expect(generateRequestSchema.safeParse({ ...validGenerate, inputMode: 'voice' }).success).toBe(
      false
    )
  })

  it('セクションが空なら拒否する', () => {
    expect(
      generateRequestSchema.safeParse({ ...validGenerate, content: { sections: [] } }).success
    ).toBe(false)
  })

  it('品目の合計が上限を超えたら拒否する', () => {
    const items = Array.from({ length: 200 }, () => item)
    const sections = Array.from({ length: 3 }, (_, i) => ({
      name_ja: `S${i}`,
      name_en: '',
      name_zh: '',
      name_ko: '',
      sort_order: i,
      items,
    }))

    const total = sections.reduce((sum, section) => sum + section.items.length, 0)
    expect(total).toBeGreaterThan(MAX_TOTAL_ITEMS)
    expect(generateRequestSchema.safeParse({ ...validGenerate, content: { sections } }).success).toBe(
      false
    )
  })

  it('負の価格を拒否する', () => {
    const content = {
      sections: [
        {
          ...validGenerate.content.sections[0],
          items: [{ ...item, price: -1 }],
        },
      ],
    }
    expect(generateRequestSchema.safeParse({ ...validGenerate, content }).success).toBe(false)
  })

  it('品目の省略された欄を既定値で埋める', () => {
    const content = { sections: [{ name_ja: 'FOOD', items: [{ name_ja: '唐揚げ' }] }] }
    const parsed = generateRequestSchema.parse({ ...validGenerate, content })

    expect(parsed.content.sections[0].items[0]).toEqual({
      name_ja: '唐揚げ',
      name_en: '',
      name_zh: '',
      name_ko: '',
      price: 0,
      currency: 'JPY',
      tax_included: true,
    })
  })
})

describe('chatRequestSchema', () => {
  const order = { menuText: '唐揚げ', lang: 'en', mode: 'order', quantity: 2 }
  const question = { menuText: '唐揚げ 680円', lang: 'en', question: 'Is this spicy?' }

  it('注文フレーズモードを通す', () => {
    expect(chatRequestSchema.safeParse(order).success).toBe(true)
  })

  it('質問モードを通す', () => {
    expect(chatRequestSchema.safeParse(question).success).toBe(true)
  })

  it('menuText が無ければ拒否する', () => {
    expect(chatRequestSchema.safeParse({ ...order, menuText: '' }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ ...order, menuText: '   ' }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ lang: 'en', mode: 'order' }).success).toBe(false)
  })

  it('menuText が長すぎれば拒否する', () => {
    const menuText = 'あ'.repeat(MAX_CHAT_MENU_TEXT_LENGTH + 1)
    expect(chatRequestSchema.safeParse({ ...order, menuText }).success).toBe(false)
  })

  it('menuText の上限ちょうどは通す', () => {
    const menuText = 'あ'.repeat(MAX_CHAT_MENU_TEXT_LENGTH)
    expect(chatRequestSchema.safeParse({ ...order, menuText }).success).toBe(true)
  })

  it('question が長すぎれば拒否する', () => {
    const longQuestion = 'a'.repeat(MAX_CHAT_QUESTION_LENGTH + 1)
    expect(chatRequestSchema.safeParse({ ...question, question: longQuestion }).success).toBe(false)
  })

  it('question の上限ちょうどは通す', () => {
    const exact = 'a'.repeat(MAX_CHAT_QUESTION_LENGTH)
    expect(chatRequestSchema.safeParse({ ...question, question: exact }).success).toBe(true)
  })

  it('質問モードで question が無ければ拒否する', () => {
    expect(chatRequestSchema.safeParse({ menuText: '唐揚げ', mode: 'question' }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ menuText: '唐揚げ' }).success).toBe(false)
  })

  it('注文モードなら question は無くてよい', () => {
    expect(chatRequestSchema.safeParse({ menuText: '唐揚げ', mode: 'order' }).success).toBe(true)
  })

  it('知らない言語は英語に落とす（旧データのため）', () => {
    const parsed = chatRequestSchema.parse({ ...order, lang: 'fr' })
    expect(parsed.lang).toBe('en')
  })

  it('lang 未指定なら英語', () => {
    const parsed = chatRequestSchema.parse({ menuText: '唐揚げ', mode: 'order' })
    expect(parsed.lang).toBe('en')
  })

  it('数量は 1 以上 99 以下に収める', () => {
    expect(chatRequestSchema.parse({ ...order, quantity: 0 }).quantity).toBe(1)
    expect(chatRequestSchema.parse({ ...order, quantity: 100 }).quantity).toBe(1)
    expect(chatRequestSchema.parse({ ...order, quantity: 2.5 }).quantity).toBe(1)
    expect(chatRequestSchema.parse({ ...order, quantity: 99 }).quantity).toBe(99)
    expect(chatRequestSchema.parse({ menuText: '唐揚げ', mode: 'order' }).quantity).toBe(1)
  })

  it('知らない mode は質問モードとして扱う', () => {
    const parsed = chatRequestSchema.safeParse({ menuText: '唐揚げ', mode: 'anything' })
    // question が無いので、質問モードとして弾かれる
    expect(parsed.success).toBe(false)
  })
})
