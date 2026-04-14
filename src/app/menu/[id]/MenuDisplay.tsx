'use client'

import { useState } from 'react'

const TEMPLATES: Record<string, { bg: string; accent: string; isDark: boolean }> = {
    gold: { bg: '#0d0d0d', accent: '#c9a84c', isDark: true },
    green: { bg: '#1a2e1a', accent: '#a8c89a', isDark: true },
    red: { bg: '#fafaf8', accent: '#c0392b', isDark: false },
    navy: { bg: '#1a2744', accent: '#7a9bd4', isDark: true },
    offwhite: { bg: '#f7f4ef', accent: '#2d6a4f', isDark: false },
    charcoal: { bg: '#2b2b2b', accent: '#e07b54', isDark: true },
    beige: { bg: '#f5ede0', accent: '#8b5e3c', isDark: false },
    pink: { bg: '#fff8f9', accent: '#c0547a', isDark: false },
}

const LANG_LABELS: Record<string, string> = {
    en: 'English',
    zh: '中文',
    ko: '한국어',
}

type MenuItem = {
    name: string
    price: number
    desc?: string
}

type Section = {
    name: string
    items: MenuItem[]
}

type TranslationData = {
    sections: Section[]
}

type Props = {
    id: string
    templateId: string
    contentJson: { sections: Section[] }
    translations: Record<string, TranslationData>
    selectedLanguages: string[]
}

export default function MenuDisplay({
    id,
    templateId,
    contentJson,
    translations,
    selectedLanguages,
}: Props) {
    const tmpl = TEMPLATES[templateId] ?? TEMPLATES['gold']
    const [lang, setLang] = useState(selectedLanguages[0] ?? 'en')
    const [chatOpen, setChatOpen] = useState(false)
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState('')
    const [loading, setLoading] = useState(false)

    const textColor = tmpl.isDark ? '#f0ece4' : '#1a1a1a'
    const subTextColor = tmpl.isDark ? 'rgba(240,236,228,0.45)' : 'rgba(30,30,30,0.45)'
    const borderColor = tmpl.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

    const currentData: TranslationData = translations?.[lang] ?? { sections: [] }
    const japaneseData = contentJson ?? { sections: [] }

    const handleAsk = async () => {
        if (!question.trim()) return
        setLoading(true)
        setAnswer('')
        try {
            const menuText = currentData.sections
                .flatMap(s => s.items.map(i => `${i.name}: ${i.desc ?? ''} (¥${i.price})`))
                .join('\n')

            const res = await fetch('/api/menu/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, menuText, lang }),
            })
            const data = await res.json()
            setAnswer(data.answer ?? 'Sorry, I could not answer that.')
        } catch {
            setAnswer('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen"
            style={{ background: tmpl.bg, color: textColor }}
        >
            {/* ヘッダー */}
            <div
                className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
                style={{ background: tmpl.bg, borderBottom: `1px solid ${borderColor}` }}
            >
                {/* 言語切り替え */}
                <div className="flex gap-2">
                    {selectedLanguages.map((l) => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className="rounded px-3 py-1 text-[11px] tracking-wider transition-all"
                            style={{
                                background: lang === l ? tmpl.accent : 'transparent',
                                color: lang === l ? (tmpl.isDark ? '#0d0d0d' : '#fff') : tmpl.accent,
                                border: `1px solid ${tmpl.accent}`,
                                opacity: lang === l ? 1 : 0.6,
                            }}
                        >
                            {LANG_LABELS[l] ?? l}
                        </button>
                    ))}
                </div>

                {/* AI質問ボタン */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="rounded px-3 py-1 text-[11px] tracking-wider transition-all"
                    style={{
                        border: `1px solid ${tmpl.accent}`,
                        color: tmpl.accent,
                    }}
                >
                    {chatOpen ? '✕ Close' : '💬 Ask AI'}
                </button>
            </div>

            {/* AI チャットパネル */}
            {chatOpen && (
                <div
                    className="mx-auto max-w-2xl px-4 py-4"
                    style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                    <p className="mb-2 text-[11px]" style={{ color: subTextColor }}>
                        Ask about any menu item in English
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                            placeholder="e.g. What is wagyu beef?"
                            className="flex-1 rounded px-3 py-2 text-[12px] outline-none"
                            style={{
                                background: tmpl.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${borderColor}`,
                                color: textColor,
                            }}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading}
                            className="rounded px-4 py-2 text-[11px] tracking-wider transition-opacity"
                            style={{
                                background: tmpl.accent,
                                color: tmpl.isDark ? '#0d0d0d' : '#fff',
                                opacity: loading ? 0.5 : 1,
                            }}
                        >
                            {loading ? '...' : 'Ask'}
                        </button>
                    </div>
                    {answer && (
                        <div
                            className="mt-3 rounded p-3 text-[12px] leading-relaxed"
                            style={{
                                background: tmpl.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                border: `1px solid ${borderColor}`,
                                color: textColor,
                            }}
                        >
                            {answer}
                        </div>
                    )}
                </div>
            )}

            {/* メニュー本体 */}
            <div className="mx-auto max-w-2xl px-4 py-8">
                {currentData.sections.map((section, si) => {
                    const jpSection = japaneseData.sections?.[si]
                    return (
                        <div key={si} className="mb-10">
                            {/* セクション名 */}
                            <div className="mb-4 flex items-center gap-3">
                                <div className="h-px flex-1" style={{ background: borderColor }} />
                                <h2
                                    className="text-[13px] tracking-[0.2em]"
                                    style={{ color: tmpl.accent }}
                                >
                                    {section.name}
                                </h2>
                                {jpSection && (
                                    <span className="text-[10px]" style={{ color: subTextColor }}>
                                        {jpSection.name}
                                    </span>
                                )}
                                <div className="h-px flex-1" style={{ background: borderColor }} />
                            </div>

                            {/* アイテム */}
                            <div className="space-y-3">
                                {section.items.map((item, ii) => {
                                    const jpItem = jpSection?.items?.[ii]
                                    return (
                                        <div
                                            key={ii}
                                            className="flex items-start justify-between gap-4 rounded p-3"
                                            style={{
                                                border: `1px solid ${borderColor}`,
                                                background: tmpl.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[13px] font-medium">{item.name}</span>
                                                    {jpItem && (
                                                        <span className="text-[10px]" style={{ color: subTextColor }}>
                                                            {jpItem.name}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.desc && (
                                                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: subTextColor }}>
                                                        {item.desc}
                                                    </p>
                                                )}
                                                {jpItem?.desc && (
                                                    <p className="mt-0.5 text-[10px]" style={{ color: subTextColor, opacity: 0.6 }}>
                                                        {jpItem.desc}
                                                    </p>
                                                )}
                                            </div>
                                            <div
                                                className="shrink-0 text-[13px] font-medium tabular-nums"
                                                style={{ color: tmpl.accent }}
                                            >
                                                ¥{item.price.toLocaleString()}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {/* フッター */}
                <div className="mt-12 text-center">
                    <p className="text-[9px] tracking-widest" style={{ color: subTextColor }}>
                        POWERED BY SHINGO KUMON TOOLS
                    </p>
                </div>
            </div>
        </div>
    )
}