'use client'

import { useState } from 'react'
import type { TemplateId } from '@/lib/limits'
import type { ToolState } from './MenuTool'

type Template = { id: TemplateId; name: string; bg: string; accent: string; textColor: string }

type Props = {
  state: ToolState
  update: (partial: Partial<ToolState>) => void
}

const TEMPLATES = [
  { id: 'gold', name: '漆黒×金', bg: '#0d0d0d', accent: '#c9a84c', textColor: '#c9a84c' },
  { id: 'green', name: '深緑×クリーム', bg: '#1a2e1a', accent: '#a8c89a', textColor: '#a8c89a' },
  { id: 'red', name: '白×朱', bg: '#fafaf8', accent: '#c0392b', textColor: '#c0392b' },
  { id: 'navy', name: 'ネイビー×白', bg: '#1a2744', accent: '#7a9bd4', textColor: '#7a9bd4' },
  { id: 'offwhite', name: 'オフホワイト×緑', bg: '#f7f4ef', accent: '#2d6a4f', textColor: '#2d6a4f' },
  { id: 'charcoal', name: 'チャコール×テラコッタ', bg: '#2b2b2b', accent: '#e07b54', textColor: '#e07b54' },
  { id: 'beige', name: 'ベージュ×ブラウン', bg: '#f5ede0', accent: '#8b5e3c', textColor: '#8b5e3c' },
  { id: 'pink', name: '白×ピンク', bg: '#fff8f9', accent: '#c0547a', textColor: '#c0547a' },
  // id は API 側の TEMPLATE_IDS と一致していないと型エラーになる。
] satisfies Template[]

export default function Step3Template({ state, update }: Props) {
  const [selected, setSelected] = useState(state.templateId)

  const handleNext = () => {
    update({ templateId: selected, step: 4 })
  }

  return (
    <div>
      <div className="mb-6 text-center text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>
        STEP 03 — デザインを選ぶ
      </div>
      <p className="mb-6 text-center text-[11px]" style={{ color: 'rgba(240,236,228,0.35)' }}>
        8つのデザインから選んでください
      </p>

      <div className="mx-auto mb-6 grid max-w-2xl grid-cols-2 gap-2 md:grid-cols-4">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setSelected(tmpl.id)}
            className="border p-3 text-center transition-colors"
            style={{
              borderColor: selected === tmpl.id ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.06)',
              background: selected === tmpl.id ? '#0f0d08' : '#0a0a0a',
            }}
          >
            {/* プレビュー */}
            <div
              className="mb-2 flex h-14 items-center justify-center rounded-sm text-[9px] tracking-wider"
              style={{ background: tmpl.bg, color: tmpl.accent }}
            >
              {tmpl.name.split('×')[0]}
            </div>
            <div
              className="text-[9px] leading-tight"
              style={{ color: selected === tmpl.id ? '#c9a84c' : 'rgba(240,236,228,0.3)' }}
            >
              {tmpl.name}
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={handleNext}
          className="border px-8 py-3 text-[11px] tracking-widest transition-colors"
          style={{ borderColor: 'rgba(201,168,76,0.4)', color: '#c9a84c' }}
        >
          このデザインで進める →
        </button>
      </div>
    </div>
  )
}
