'use client'

import { useState, useEffect } from 'react'

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

const VALID_LANGS = ['en', 'zh', 'ko']

const LANG_LABELS: Record<string, string> = {
    en: 'EN',
    zh: 'ZH',
    ko: 'KO',
}

type MenuItem = {
    name: string
    price: number
    desc?: string
}

type JpMenuItem = {
    name_ja: string
    name_en?: string
    price: number
    desc?: string
    currency?: string
    tax_included?: boolean
}

type JpSection = {
    // content_json に入っているのは name_ja。name は古い行のための保険。
    name_ja?: string
    name?: string
    items: JpMenuItem[]
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
    contentJson: { sections: JpSection[] }
    translations: Record<string, TranslationData>
    selectedLanguages: string[]
}

type OrderPhrase = {
    foreign: string
    japanese: string
}

// translationsオブジェクトから実際に使える言語を抽出
function detectAvailableLangs(rawT: any, selectedLanguages: string[]): string[] {
    if (!rawT || typeof rawT !== 'object') return selectedLanguages

    // 新形式: {"en": {"sections": [...]}, "zh": {...}}
    const fromTranslations = VALID_LANGS.filter(
        (k) => rawT[k] && Array.isArray(rawT[k].sections)
    )
    if (fromTranslations.length > 0) return fromTranslations

    // 旧形式: {"sections": [...]} → selected_languagesを使う
    return selectedLanguages
}

export default function MenuDisplay({
    id,
    templateId,
    contentJson,
    translations,
    selectedLanguages,
}: Props) {
    const tmpl = TEMPLATES[templateId] ?? TEMPLATES['gold']

    const rawT = translations as any

    // 実際に表示可能な言語を translations 実体から判定
    const langsToShow = detectAvailableLangs(rawT, selectedLanguages)
    const initialLang = langsToShow[0] ?? selectedLanguages[0] ?? 'en'

    const [activeLang, setActiveLang] = useState(initialLang)

    // langsToShow が変わったとき activeLang が無効になっていたら補正
    useEffect(() => {
        if (!langsToShow.includes(activeLang)) {
            setActiveLang(langsToShow[0] ?? 'en')
        }
    }, [translations, selectedLanguages])

    const lang = activeLang

    const textColor = tmpl.isDark ? '#f0ece4' : '#1a1a1a'
    const subTextColor = tmpl.isDark ? 'rgba(240,236,228,0.5)' : 'rgba(30,30,30,0.5)'
    const borderColor = tmpl.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    const cardBg = tmpl.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'

    const [quantities, setQuantities] = useState<Record<string, number>>({})
    const [orderPhrases, setOrderPhrases] = useState<Record<string, OrderPhrase | null>>({})
    const [loadingKey, setLoadingKey] = useState<string | null>(null)

    // 表示データ取得（新形式・旧形式両対応）
    const currentData: TranslationData =
        rawT?.[lang] ?? (rawT?.sections ? rawT : { sections: [] })

    const japaneseData = contentJson ?? { sections: [] }

    const getQuantity = (key: string) => quantities[key] ?? 1

    const setQuantity = (key: string, val: number) => {
        if (val < 1) return
        setQuantities((prev) => ({ ...prev, [key]: val }))
    }

    const handleOrder = async (key: string, itemName: string, qty: number) => {
        setLoadingKey(key)
        setOrderPhrases((prev) => ({ ...prev, [key]: null }))
        try {
            const res = await fetch('/api/menu/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: `Generate an order phrase for "${itemName}", quantity ${qty}`,
                    menuText: itemName,
                    lang,
                    mode: 'order',
                    quantity: qty,
                }),
            })
            const data = await res.json()
            setOrderPhrases((prev) => ({
                ...prev,
                [key]: {
                    foreign: data.foreign ?? '',
                    japanese: data.japanese ?? '',
                },
            }))
        } catch {
            setOrderPhrases((prev) => ({
                ...prev,
                [key]: { foreign: 'Sorry, please try again.', japanese: 'もう一度お試しください' },
            }))
        } finally {
            setLoadingKey(null)
        }
    }

    return (
        <div className="min-h-screen" style={{ background: tmpl.bg, color: textColor }}>

            {/* ヘッダー */}
            <div
                className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
                style={{ background: tmpl.bg, borderBottom: `1px solid ${borderColor}` }}
            >
                <span className="text-[10px] tracking-[0.2em]" style={{ color: tmpl.accent }}>
                    MENU
                </span>

                {/* 言語切り替え（2言語以上のとき表示） */}
                {langsToShow.length > 1 && (
                    <div className="flex gap-1">
                        {langsToShow.map((l) => (
                            <button
                                key={l}
                                onClick={() => setActiveLang(l)}
                                className="px-2 py-1 text-[10px] tracking-widest transition-all"
                                style={{
                                    border: `1px solid ${l === activeLang ? tmpl.accent : borderColor}`,
                                    color: l === activeLang ? tmpl.accent : subTextColor,
                                    background: l === activeLang ? `${tmpl.accent}18` : 'transparent',
                                }}
                            >
                                {LANG_LABELS[l] ?? l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* メニュー本体 */}
            <div className="mx-auto max-w-2xl px-4 py-8">
                {currentData.sections.map((section, si) => {
                    const jpSection = japaneseData.sections?.[si]
                    return (
                        <div key={si} className="mb-10">

                            {/* セクション名 */}
                            <div className="mb-4 flex items-center gap-3">
                                <div className="h-px flex-1" style={{ background: borderColor }} />
                                <div className="text-center">
                                    <div className="text-[13px] tracking-[0.2em]" style={{ color: tmpl.accent }}>
                                        {section.name}
                                    </div>
                                    {jpSection && (jpSection.name_ja || jpSection.name) && (
                                        <div className="mt-0.5 text-[10px]" style={{ color: subTextColor }}>
                                            {jpSection.name_ja || jpSection.name}
                                        </div>
                                    )}
                                </div>
                                <div className="h-px flex-1" style={{ background: borderColor }} />
                            </div>

                            {/* アイテム */}
                            <div className="space-y-3">
                                {section.items.map((item, ii) => {
                                    const jpItem = jpSection?.items?.[ii]
                                    const key = `${si}-${ii}`
                                    const qty = getQuantity(key)
                                    const phrase = orderPhrases[key]
                                    const isLoading = loadingKey === key

                                    return (
                                        <div
                                            key={ii}
                                            className="rounded p-4"
                                            style={{ border: `1px solid ${borderColor}`, background: cardBg }}
                                        >
                                            {/* 品名・価格 */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="text-[14px] font-medium" style={{ color: textColor }}>
                                                        {item.name}
                                                    </div>
                                                    {jpItem?.name_ja && (
                                                        <div className="mt-0.5 text-[11px]" style={{ color: subTextColor }}>
                                                            {jpItem.name_ja}
                                                        </div>
                                                    )}
                                                    {item.desc && (
                                                        <div className="mt-2 text-[11px] leading-relaxed" style={{ color: subTextColor }}>
                                                            {item.desc}
                                                        </div>
                                                    )}
                                                    {jpItem?.desc && (
                                                        <div className="mt-0.5 text-[10px] leading-relaxed" style={{ color: subTextColor, opacity: 0.6 }}>
                                                            {jpItem.desc}
                                                        </div>
                                                    )}
                                                </div>
                                                <div
                                                    className="shrink-0 text-[14px] font-medium tabular-nums"
                                                    style={{ color: tmpl.accent }}
                                                >
                                                    ¥{item.price.toLocaleString()}
                                                </div>
                                            </div>

                                            {/* 数量 + 注文ボタン */}
                                            <div className="mt-3 flex items-center gap-3">
                                                <div
                                                    className="flex items-center gap-0"
                                                    style={{ border: `1px solid ${borderColor}`, borderRadius: '4px' }}
                                                >
                                                    <button
                                                        onClick={() => setQuantity(key, qty - 1)}
                                                        className="flex h-8 w-8 items-center justify-center text-[14px] transition-opacity"
                                                        style={{ color: subTextColor, opacity: qty <= 1 ? 0.3 : 1 }}
                                                        disabled={qty <= 1}
                                                    >
                                                        −
                                                    </button>
                                                    <span
                                                        className="w-8 text-center text-[13px] tabular-nums"
                                                        style={{ color: textColor }}
                                                    >
                                                        {qty}
                                                    </span>
                                                    <button
                                                        onClick={() => setQuantity(key, qty + 1)}
                                                        className="flex h-8 w-8 items-center justify-center text-[14px] transition-opacity"
                                                        style={{ color: subTextColor }}
                                                    >
                                                        ＋
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleOrder(key, item.name, qty)}
                                                    disabled={isLoading}
                                                    className="flex-1 py-2 text-[11px] tracking-wider transition-all"
                                                    style={{
                                                        border: `1px solid ${tmpl.accent}`,
                                                        color: tmpl.accent,
                                                        opacity: isLoading ? 0.5 : 1,
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    {isLoading ? '...' : '🗣 注文する'}
                                                </button>
                                            </div>

                                            {/* 注文フレーズ表示 */}
                                            {phrase && (
                                                <div
                                                    className="mt-3 rounded p-3"
                                                    style={{
                                                        background: tmpl.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                        border: `1px solid ${borderColor}`,
                                                    }}
                                                >
                                                    <div className="text-[13px] font-medium" style={{ color: textColor }}>
                                                        {phrase.foreign}
                                                    </div>
                                                    <div className="mt-1 text-[11px]" style={{ color: subTextColor }}>
                                                        {phrase.japanese}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                <div className="mt-12 text-center">
                    <p className="text-[9px] tracking-widest" style={{ color: subTextColor, opacity: 0.5 }}>
                        POWERED BY SHINGO KUMON TOOLS
                    </p>
                </div>
            </div>
        </div>
    )
}