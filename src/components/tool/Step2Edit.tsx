'use client'

import { useState } from 'react'
import type { ToolState } from './MenuTool'
import type { MenuSection, MenuItem } from '@/types/database'

type Props = {
  state: ToolState
  update: (partial: Partial<ToolState>) => void
}

const INDUSTRIES = ['飲食・カフェ', '旅館・ホテル', '美容・ネイル', 'エステ', '整骨院・整体', 'その他']

const INDUSTRY_PRESETS: Record<string, { sections: string[] }> = {
  '飲食・カフェ': { sections: ['FOOD', 'DRINKS'] },
  '旅館・ホテル': { sections: ['ルームサービス', 'ドリンク'] },
  '美容・ネイル': { sections: ['カット・カラー', 'ネイルメニュー'] },
  'エステ': { sections: ['フェイシャル', 'ボディ'] },
  '整骨院・整体': { sections: ['施術メニュー', 'コース'] },
  'その他': { sections: ['メニュー', '料金'] },
}

export default function Step2Edit({ state, update }: Props) {
  const [industry, setIndustry] = useState(state.industry)
  const [shopName, setShopName] = useState(state.shopName)
  const [sections, setSections] = useState<MenuSection[]>(
    state.content.sections.length > 0
      ? state.content.sections
      : [{ name_ja: 'メニュー', name_en: '', name_zh: '', name_ko: '', sort_order: 0, items: [] }]
  )

  const applyIndustry = (ind: string) => {
    setIndustry(ind)
    const preset = INDUSTRY_PRESETS[ind]
    if (preset && sections.length === 0) {
      setSections(
        preset.sections.map((name, i) => ({
          name_ja: name, name_en: '', name_zh: '', name_ko: '', sort_order: i, items: [],
        }))
      )
    }
  }

  const updateSectionName = (idx: number, name: string) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, name_ja: name } : s))
  }

  const addItem = (sectionIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              items: [...s.items, { name_ja: '', name_en: '', name_zh: '', name_ko: '', price: 0, currency: 'JPY', tax_included: true }],
            }
          : s
      )
    )
  }

  const updateItem = (sectionIdx: number, itemIdx: number, field: keyof MenuItem, value: string | number | boolean) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIdx
          ? { ...s, items: s.items.map((item, ii) => ii === itemIdx ? { ...item, [field]: value } : item) }
          : s
      )
    )
  }

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIdx ? { ...s, items: s.items.filter((_, ii) => ii !== itemIdx) } : s
      )
    )
  }

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { name_ja: '', name_en: '', name_zh: '', name_ko: '', sort_order: prev.length, items: [] },
    ])
  }

  const handleNext = () => {
    update({
      shopName,
      industry,
      content: { sections },
      step: 3,
    })
  }

  return (
    <div>
      <div className="mb-6 text-center text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>
        STEP 02 — 内容を確認・編集
      </div>

      {/* 業種タブ */}
      <div className="mb-5 text-[9px] tracking-widest" style={{ color: 'rgba(201,168,76,0.4)' }}>
        業種を選ぶと項目名が変わります
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => applyIndustry(ind)}
            className="border px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              borderColor: industry === ind ? 'rgba(201,168,76,0.65)' : 'rgba(201,168,76,0.2)',
              color: industry === ind ? '#c9a84c' : 'rgba(201,168,76,0.6)',
              background: industry === ind ? 'rgba(201,168,76,0.06)' : 'none',
            }}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* 店名 */}
      <div className="mb-5">
        <div className="mb-2 text-[9px] tracking-widest" style={{ color: 'rgba(201,168,76,0.4)' }}>
          店名
        </div>
        <input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="w-full border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: 'rgba(201,168,76,0.15)', color: '#f0ece4' }}
          placeholder="例：山田屋"
        />
      </div>

      {/* セクション・品目 */}
      {sections.map((section, si) => (
        <div key={si} className="mb-5">
          {/* セクション名 */}
          <div className="mb-2 flex items-center gap-3">
            <input
              value={section.name_ja}
              onChange={(e) => updateSectionName(si, e.target.value)}
              className="border-b bg-transparent pb-1 text-[9px] tracking-[0.2em]"
              style={{ borderColor: 'rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.6)', width: '160px' }}
              placeholder="セクション名"
            />
            <span className="text-[9px]" style={{ color: 'rgba(201,168,76,0.22)' }}>
              ← 編集できます
            </span>
          </div>

          {/* 品目リスト */}
          {section.items.map((item, ii) => (
            <div key={ii} className="mb-2 grid items-center gap-2" style={{ gridTemplateColumns: '1fr 88px 18px' }}>
              <input
                value={item.name_ja}
                onChange={(e) => updateItem(si, ii, 'name_ja', e.target.value)}
                className="border bg-transparent px-3 py-2 text-xs"
                style={{ borderColor: 'rgba(201,168,76,0.08)', color: '#f0ece4' }}
                placeholder="品名"
              />
              <input
                value={item.price === 0 ? '' : item.price}
                onChange={(e) => updateItem(si, ii, 'price', Number(e.target.value) || 0)}
                className="border bg-transparent px-3 py-2 text-xs"
                style={{ borderColor: 'rgba(201,168,76,0.08)', color: '#c9a84c' }}
                placeholder="¥0"
                type="number"
              />
              <button
                onClick={() => removeItem(si, ii)}
                className="text-xs"
                style={{ color: 'rgba(240,236,228,0.15)' }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* 品目追加 */}
          <button
            onClick={() => addItem(si)}
            className="mt-1 w-full border border-dashed py-2 text-[10px] tracking-wider"
            style={{ borderColor: 'rgba(201,168,76,0.12)', color: 'rgba(201,168,76,0.3)' }}
          >
            ＋ 品目を追加
          </button>
        </div>
      ))}

      {/* セクション追加 */}
      <button
        onClick={addSection}
        className="mb-6 text-[10px] tracking-wider"
        style={{ color: 'rgba(201,168,76,0.25)' }}
      >
        ＋ セクションを追加する
      </button>

      {/* 次へ */}
      <button
        onClick={handleNext}
        disabled={!shopName}
        className="w-full border py-3 text-[11px] tracking-widest transition-colors disabled:opacity-40"
        style={{ borderColor: 'rgba(201,168,76,0.4)', color: '#c9a84c' }}
      >
        この内容で翻訳する →
      </button>
    </div>
  )
}
