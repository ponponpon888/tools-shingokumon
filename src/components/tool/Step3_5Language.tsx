'use client'

import type { ToolState } from './MenuTool'

type Props = {
    state: ToolState
    update: (partial: Partial<ToolState>) => void
}

type LangOption = {
    id: string
    label: string
    note: string
}

const LANG_OPTIONS: LangOption[] = [
    { id: 'en', label: 'English', note: '外国人の約80%がカバーできます（推奨）' },
    { id: 'zh', label: '中文（简体字）', note: '訪日中国人・台湾人旅行者に対応' },
    { id: 'ko', label: '한국어', note: 'リピーターの多い韓国人旅行客に対応' },
]

const gold = '#c9a84c'
const goldFaint = 'rgba(201,168,76,0.08)'
const goldBorder = 'rgba(201,168,76,0.2)'
const goldActive = 'rgba(201,168,76,0.45)'
const textPrimary = '#f0ece4'
const textMuted = 'rgba(240,236,228,0.45)'

export default function Step3_5Language({ state, update }: Props) {
    const selected = state.selectedLanguages ?? ['en']

    const toggle = (id: string) => {
        if (id === 'en') return
        const next = selected.includes(id)
            ? selected.filter((l) => l !== id)
            : [...selected, id]
        update({ selectedLanguages: next })
    }

    const isAll = selected.includes('en') && selected.includes('zh') && selected.includes('ko')

    return (
        <div>
            <div className="mb-8">
                <div className="mb-2 text-[9px] tracking-[0.25em]" style={{ color: 'rgba(201,168,76,0.45)' }}>
                    STEP 03.5
                </div>
                <h2 className="text-base font-light" style={{ color: textPrimary }}>
                    翻訳する言語を選んでください
                </h2>
                <p className="mt-2 text-xs" style={{ color: textMuted }}>
                    英語は必須です。中国語・韓国語は任意で追加できます。
                </p>
            </div>

            <div className="space-y-3">
                {LANG_OPTIONS.map((opt) => {
                    const isSelected = selected.includes(opt.id)
                    const isRequired = opt.id === 'en'
                    return (
                        <button
                            key={opt.id}
                            onClick={() => toggle(opt.id)}
                            className="flex w-full items-start gap-4 border p-4 text-left transition-colors"
                            style={{
                                borderColor: isSelected ? goldActive : goldBorder,
                                background: isSelected ? goldFaint : 'transparent',
                                cursor: isRequired ? 'default' : 'pointer',
                            }}
                        >
                            <div
                                className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border"
                                style={{
                                    borderColor: isSelected ? gold : goldBorder,
                                    background: isSelected ? gold : 'transparent',
                                }}
                            >
                                {isSelected && (
                                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                        <path d="M1 4.5l2.5 2.5 5-5" stroke="#0a0a0a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-light" style={{ color: textPrimary }}>
                                        {opt.label}
                                    </span>
                                    {isRequired && (
                                        <span className="text-[9px] tracking-widest" style={{ color: gold }}>
                                            必須
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 text-[11px]" style={{ color: textMuted }}>
                                    {opt.note}
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            {isAll && (
                <div className="mt-4 border p-3 text-xs" style={{ borderColor: 'rgba(201,168,76,0.15)', color: textMuted }}>
                    3言語すべて選択中です。生成に少し時間がかかります。
                </div>
            )}

            <button
                onClick={() => update({ step: 4 })}
                className="mt-8 w-full border py-4 text-sm font-light tracking-widest transition-colors"
                style={{ borderColor: goldActive, color: textPrimary }}
            >
                次へ — メールアドレスを入力する →
            </button>

            <button
                onClick={() => update({ step: 3 })}
                className="mt-3 w-full text-center text-xs"
                style={{ color: textMuted }}
            >
                ← テンプレート選択に戻る
            </button>
        </div>
    )
}