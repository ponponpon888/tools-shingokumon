'use client'

import type { ToolState } from './MenuTool'

type Props = {
    state: ToolState
    update: (partial: Partial<ToolState>) => void
}

type LangOption = {
    id: string
    code: string
    label: string
    note: string
}

const LANG_OPTIONS: LangOption[] = [
    { id: 'en', code: 'EN', label: 'English', note: '外国人の約80%をカバー（推奨）' },
    { id: 'zh', code: 'ZH', label: '中文（简体字）', note: '訪日中国人・台湾人旅行者に対応' },
    { id: 'ko', code: 'KO', label: '한국어', note: 'リピーターの多い韓国人旅行客に対応' },
]

const gold = '#c9a84c'
const goldFaint = 'rgba(201,168,76,0.08)'
const goldBorder = 'rgba(201,168,76,0.2)'
const goldActive = 'rgba(201,168,76,0.45)'
const textPrimary = '#f0ece4'
const textMuted = 'rgba(240,236,228,0.45)'

export default function Step3_5Language({ state, update }: Props) {
    const selected = (state?.selectedLanguages ?? ['en'])[0] ?? 'en'

    const handleSelect = (id: string) => {
        update({ selectedLanguages: [id] })
    }

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
                    日本語は常に併記されます。外国語を1つ選んでください。
                </p>
            </div>

            <div className="space-y-3">
                {LANG_OPTIONS.map((opt) => {
                    const isSelected = selected === opt.id
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleSelect(opt.id)}
                            className="flex w-full items-center gap-4 border p-4 text-left transition-colors"
                            style={{
                                borderColor: isSelected ? goldActive : goldBorder,
                                background: isSelected ? goldFaint : 'transparent',
                            }}
                        >
                            {/* 言語コード */}
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-[11px] font-medium tracking-widest"
                                style={{
                                    border: `1px solid ${isSelected ? gold : goldBorder}`,
                                    color: isSelected ? gold : textMuted,
                                    background: isSelected ? 'rgba(201,168,76,0.12)' : 'transparent',
                                }}
                            >
                                {opt.code}
                            </div>

                            {/* テキスト */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-light" style={{ color: textPrimary }}>
                                        {opt.label}
                                    </span>
                                    {opt.id === 'en' && (
                                        <span className="text-[9px] tracking-widest" style={{ color: gold }}>
                                            推奨
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 text-[11px]" style={{ color: textMuted }}>
                                    {opt.note}
                                </div>
                            </div>

                            {/* ラジオインジケーター */}
                            <div
                                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border"
                                style={{
                                    borderColor: isSelected ? gold : goldBorder,
                                }}
                            >
                                {isSelected && (
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: gold }}
                                    />
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            <button
                onClick={() => update({ step: 5 })}
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