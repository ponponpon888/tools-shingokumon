import { describe, expect, it } from 'vitest'
import { buildDay0Email } from '@/lib/day0-email'

const baseArgs = {
  menuProjectId: '11111111-2222-3333-4444-555555555555',
  selectedLanguages: ['en', 'ko'],
  baseUrl: 'https://example.test',
}

describe('buildDay0Email', () => {
  it('店名のタグを生のまま埋め込まない', () => {
    const { html } = buildDay0Email({
      ...baseArgs,
      shopName: '<img src=x onerror="alert(1)">',
    })

    expect(html).not.toContain('<img')
    // 引用符が残っていなければ属性としては成立しない
    expect(html).not.toContain('onerror="')
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('店名の引用符で属性を抜け出せない', () => {
    const { html } = buildDay0Email({
      ...baseArgs,
      shopName: '" style="display:none',
    })

    expect(html).not.toContain('" style="display:none')
    expect(html).toContain('&quot; style=&quot;display:none')
  })

  it('件名に改行を持ち込ませない', () => {
    const { subject } = buildDay0Email({
      ...baseArgs,
      shopName: '山田屋\r\nBcc: someone@example.test',
    })

    expect(subject).not.toContain('\n')
    expect(subject).not.toContain('\r')
  })

  it('リンクには渡された baseUrl と project id を使う', () => {
    const { html } = buildDay0Email({ ...baseArgs, shopName: '山田屋' })

    expect(html).toContain(`https://example.test/menu/${baseArgs.menuProjectId}`)
    expect(html).toContain(`https://example.test/unsubscribe?id=${baseArgs.menuProjectId}`)
  })

  it('選択した言語を日本語の表示名にする', () => {
    const { html } = buildDay0Email({ ...baseArgs, shopName: '山田屋' })

    expect(html).toContain('英語・韓国語')
  })
})
