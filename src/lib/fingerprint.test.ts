import { describe, expect, it } from 'vitest'
import { canonicalize, fingerprint } from '@/lib/fingerprint'
import { generateRequestSchema } from '@/lib/validation'

const item = {
  name_ja: '唐揚げ',
  name_en: '',
  name_zh: '',
  name_ko: '',
  price: 680,
  currency: 'JPY',
  tax_included: true,
}

const payload = {
  email: 'owner@example.test',
  shopName: '山田屋',
  industry: '飲食・カフェ',
  industryOther: '',
  templateId: 'gold',
  inputMode: 'image_ocr',
  selectedLanguages: ['en', 'ko'],
  content: {
    sections: [
      { name_ja: 'FOOD', name_en: '', name_zh: '', name_ko: '', sort_order: 0, items: [item] },
    ],
  },
}

describe('canonicalize', () => {
  it('オブジェクトのキーを並べ替える', () => {
    expect(JSON.stringify(canonicalize({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}')
  })

  it('配列の順序は保つ', () => {
    expect(JSON.stringify(canonicalize([3, 1, 2]))).toBe('[3,1,2]')
  })

  it('undefined の欄を落とす', () => {
    expect(JSON.stringify(canonicalize({ a: 1, b: undefined }))).toBe('{"a":1}')
  })

  it('入れ子にも効く', () => {
    expect(JSON.stringify(canonicalize({ x: { d: 1, c: 2 } }))).toBe('{"x":{"c":2,"d":1}}')
  })
})

describe('fingerprint', () => {
  it('同じ内容ならキー順が違っても同じ値になる', () => {
    const a = { email: 'a@example.test', shopName: '山田屋' }
    const b = { shopName: '山田屋', email: 'a@example.test' }

    expect(fingerprint(a)).toBe(fingerprint(b))
  })

  it('内容が変われば値が変わる', () => {
    expect(fingerprint({ price: 680 })).not.toBe(fingerprint({ price: 681 }))
  })

  it('64 文字の16進になる', () => {
    expect(fingerprint(payload)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('冪等性のキー', () => {
  it('検証を通した後なら、言語の並び順が違っても同じキーになる', () => {
    const a = generateRequestSchema.parse({ ...payload, selectedLanguages: ['en', 'ko'] })
    const b = generateRequestSchema.parse({ ...payload, selectedLanguages: ['ko', 'en'] })

    expect(fingerprint(a)).toBe(fingerprint(b))
  })

  it('メールの大文字小文字が違っても同じキーになる', () => {
    const a = generateRequestSchema.parse({ ...payload, email: 'owner@example.test' })
    const b = generateRequestSchema.parse({ ...payload, email: 'Owner@Example.Test' })

    expect(fingerprint(a)).toBe(fingerprint(b))
  })

  it('品目が 1 つ違えば別のキーになる', () => {
    const changed = {
      ...payload,
      content: {
        sections: [
          {
            ...payload.content.sections[0],
            items: [{ ...item, price: 700 }],
          },
        ],
      },
    }

    const a = generateRequestSchema.parse(payload)
    const b = generateRequestSchema.parse(changed)

    expect(fingerprint(a)).not.toBe(fingerprint(b))
  })

  it('テンプレートが違えば別のキーになる', () => {
    const a = generateRequestSchema.parse(payload)
    const b = generateRequestSchema.parse({ ...payload, templateId: 'navy' })

    expect(fingerprint(a)).not.toBe(fingerprint(b))
  })
})
