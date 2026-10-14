import { describe, expect, it } from 'vitest'
import { escapeHtml } from '@/lib/html'

describe('escapeHtml', () => {
  it('タグを無効化する', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('属性値を抜け出せる引用符も変換する', () => {
    expect(escapeHtml('" onmouseover="alert(1)')).toBe(
      '&quot; onmouseover=&quot;alert(1)'
    )
    expect(escapeHtml("' onfocus='x")).toBe('&#39; onfocus=&#39;x')
  })

  it('アンパサンドを先に変換して二重エスケープを避ける', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('普通の店名はそのまま残す', () => {
    expect(escapeHtml('山田屋 本店')).toBe('山田屋 本店')
  })
})
