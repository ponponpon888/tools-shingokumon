import { describe, expect, it } from 'vitest'
import { extractMenu, findJsonBlock } from '@/lib/ocr-parse'

const complete = `{
  "shopName": "山田屋",
  "sections": [
    { "name_ja": "FOOD", "items": [
      { "name_ja": "唐揚げ", "price": 680 },
      { "name_ja": "枝豆", "price": 380 }
    ] }
  ]
}`

describe('findJsonBlock', () => {
  it('前後の説明文を落とす', () => {
    expect(findJsonBlock('以下です。\n{"a":1}\nどうぞ')).toBe('{"a":1}')
  })

  it('閉じ括弧が無くても { 以降を返す', () => {
    expect(findJsonBlock('{"a":1')).toBe('{"a":1')
  })

  it('{ が無ければ null', () => {
    expect(findJsonBlock('読み取れませんでした')).toBeNull()
  })
})

describe('extractMenu', () => {
  it('正常な JSON を読む', () => {
    const result = extractMenu(complete)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.extraction.shopName).toBe('山田屋')
    expect(result.extraction.itemCount).toBe(2)
    expect(result.extraction.salvaged).toBe(false)
    expect(result.extraction.content.sections[0].name_ja).toBe('FOOD')
    expect(result.extraction.content.sections[0].items[0]).toMatchObject({
      name_ja: '唐揚げ',
      price: 680,
      currency: 'JPY',
      tax_included: true,
    })
  })

  it('余計な説明文が付いていても読む', () => {
    const result = extractMenu(`読み取りました。\n${complete}\n以上です。`)
    expect(result.ok).toBe(true)
  })

  it('途中で切れた応答から、完結している品目だけ救出する', () => {
    const truncated = `{
      "shopName": "山田屋",
      "sections": [
        { "name_ja": "FOOD", "items": [
          { "name_ja": "唐揚げ", "price": 680 },
          { "name_ja": "枝豆", "price": 380 },
          { "name_ja": "出し`

    const result = extractMenu(truncated)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.extraction.salvaged).toBe(true)
    expect(result.extraction.itemCount).toBe(2)
    expect(result.extraction.content.sections[0].items.map((i) => i.name_ja)).toEqual([
      '唐揚げ',
      '枝豆',
    ])
  })

  it('セクションの途中で切れていても、完結したセクションを残す', () => {
    const truncated = `{
      "shopName": "",
      "sections": [
        { "name_ja": "FOOD", "items": [ { "name_ja": "唐揚げ", "price": 680 } ] },
        { "name_ja": "DRINKS", "items": [ { "name_ja": "生ビ`

    const result = extractMenu(truncated)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.extraction.salvaged).toBe(true)
    expect(result.extraction.content.sections).toHaveLength(1)
    expect(result.extraction.content.sections[0].name_ja).toBe('FOOD')
  })

  it('JSON が無ければ no_json', () => {
    const result = extractMenu('この画像からメニューは読み取れませんでした。')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('no_json')
  })

  it('1 品目も救出できなければ unparsable', () => {
    const result = extractMenu('{ "shopName": "山田屋", "sections": [ { "name_ja": "FO')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('unparsable')
  })

  it('名前が空の品目は捨てる', () => {
    const withBlank = `{ "shopName": "", "sections": [ { "name_ja": "FOOD", "items": [
      { "name_ja": "", "price": 100 },
      { "name_ja": "唐揚げ", "price": 680 }
    ] } ] }`

    const result = extractMenu(withBlank)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.itemCount).toBe(1)
  })

  it('セクション名が無ければ「メニュー」にする', () => {
    const result = extractMenu('{ "sections": [ { "items": [ { "name_ja": "唐揚げ" } ] } ] }')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.content.sections[0].name_ja).toBe('メニュー')
  })

  it('価格が文字列や不正値でも数値に落とす', () => {
    const result = extractMenu(`{ "sections": [ { "name_ja": "FOOD", "items": [
      { "name_ja": "A", "price": "680" },
      { "name_ja": "B", "price": "時価" },
      { "name_ja": "C", "price": -5 }
    ] } ] }`)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.extraction.content.sections[0].items.map((i) => i.price)).toEqual([680, 0, 0])
  })

  it('文字列の中の括弧に惑わされない', () => {
    const result = extractMenu(`{ "sections": [ { "name_ja": "FOOD {特集}", "items": [
      { "name_ja": "唐揚げ [大]", "price": 680 }
    ] } ] }`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.extraction.content.sections[0].name_ja).toBe('FOOD {特集}')
  })
})
