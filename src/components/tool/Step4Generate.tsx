'use client'

import { useState } from 'react'
import type { ToolState } from './MenuTool'

type Props = {
    state: ToolState
    update: (partial: Partial<ToolState>) => void
}

const INDUSTRIES = ['飲食・カフェ', '旅館・ホテル', '美容・ネイル', 'エステ', '整骨院・整体', 'その他']

const LOADING_MESSAGES = [
    'AIがメニューを読み取っています...',
    '英語に翻訳中...',
    '中国語に翻訳中...',
    '韓国語に翻訳中...',
    'メニュー表を組み立てています...',
]

export default function Step4Generate({ state, update }: Props) {
    const [email, setEmail] = useState(state.email)
    const [industry, setIndustry] = useState(state.industry)
    const [industryOther, setIndustryOther] = useState(state.industryOther)
    const [loading, setLoading] = useState(false)
    const [loadingMsg, setLoadingMsg] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!email || !email.includes('@')) {
            setError('正しいメールアドレスを入力してください')
            return
        }

        setLoading(true)
        setError(null)

        let msgIdx = 0
        setLoadingMsg(LOADING_MESSAGES[0])
        const msgInterval = setInterval(() => {
            msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
            setLoadingMsg(LOADING_MESSAGES[msgIdx])
        }, 3000)

        try {
            const res = await fetch('/api/tools/menu/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    shopName: state.shopName,
                    industry,
                    industryOther,
                    templateId: state.templateId,
                    content: state.content,
                    inputMode: state.inputMode,
                }),
            })

            if (!res.ok) throw new Error('生成に失敗しました')

            const data = await res.json()
            if (!data.content) throw new Error('翻訳結果が取得できませんでした')

            update({
                email,
                industry,
                industryOther,
                generatedContent: data.content,
                menuProjectId: data.menuProjectId,
                step: 5,
            })
        } catch {
            setError('生成に失敗しました。もう一度お試しください。')
        } finally {
            clearInterval(msgInterval)
            setLoading(false)
        }
    }

    return (
        <div>
            <div
                className="mb-6 text-center text-[9px] tracking-[0.2em]"
                style={{ color: 'rgba(201,168,76,0.4)' }}
            >
                STEP 04 — メールアドレスを入力して生成する
            </div>

            <div className="mx-auto max-w-sm">
                <div className="mb-5">
                    <div className="mb-2 text-[9px] tracking-widest" style={{ color: 'rgba(201,168,76,0.4)' }}>
                        メールアドレス <span style={{ color: 'rgba(201,168,76,0.6)' }}>*</span>
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full border bg-transparent px-3 py-3 text-sm"
                        style={{ borderColor: 'rgba(201,168,76,0.2)', color: '#f0ece4' }}
                    />
                    <p className="mt-1.5 text-[10px]" style={{ color: 'rgba(240,236,228,0.2)' }}>
                        完成したメニューと役立つ情報をお届けします
                    </p>
                </div>

                <div className="mb-6">
                    <div className="mb-2 text-[9px] tracking-widest" style={{ color: 'rgba(201,168,76,0.4)' }}>
                        業種（任意）
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {INDUSTRIES.map((ind) => (
                            <button
                                key={ind}
                                onClick={() => setIndustry(ind)}
                                className="border py-2 text-[10px] transition-colors"
                                style={{
                                    borderColor: industry === ind ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)',
                                    color: industry === ind ? '#c9a84c' : 'rgba(240,236,228,0.5)',
                                    background: industry === ind ? 'rgba(201,168,76,0.05)' : 'none',
                                }}
                            >
                                {ind}
                            </button>
                        ))}
                    </div>
                    {industry === 'その他' && (
                        <input
                            value={industryOther}
                            onChange={(e) => setIndustryOther(e.target.value)}
                            className="mt-2 w-full border bg-transparent px-3 py-2 text-xs"
                            style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(240,236,228,0.4)' }}
                            placeholder="業種を記入（任意）"
                        />
                    )}
                </div>

                <div
                    className="mb-6 border p-4"
                    style={{ borderColor: 'rgba(201,168,76,0.1)', background: '#0f0d08' }}
                >
                    <div className="mb-2 text-[8px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.35)' }}>
                        生成内容
                    </div>
                    {[
                        { label: '店名', value: state.shopName },
                        { label: 'テンプレート', value: state.templateId },
                        { label: '品目数', value: `${state.content.sections.reduce((s, sec) => s + sec.items.length, 0)}品目` },
                        { label: '翻訳言語', value: '英語・中国語・韓国語' },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="flex justify-between border-b py-1.5 text-[11px]"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                        >
                            <span style={{ color: 'rgba(240,236,228,0.35)' }}>{label}</span>
                            <span style={{ color: label === '翻訳言語' ? '#c9a84c' : '#f0ece4' }}>{value}</span>
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="mb-4 text-center">
                        <div className="mb-2 flex items-center justify-center gap-2">
                            <div
                                className="h-4 w-4 animate-spin rounded-full border border-t-transparent"
                                style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }}
                            />
                            <span className="text-xs" style={{ color: 'rgba(201,168,76,0.7)' }}>
                                {loadingMsg}
                            </span>
                        </div>
                        <div className="text-[10px]" style={{ color: 'rgba(240,236,228,0.2)' }}>
                            品目数によって30秒ほどかかる場合があります
                        </div>
                    </div>
                )}

                {error && (
                    <p className="mb-4 text-center text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
                        {error}
                    </p>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={loading || !email}
                    className="w-full border py-4 text-[11px] tracking-widest transition-colors disabled:opacity-40"
                    style={{ borderColor: 'rgba(201,168,76,0.45)', color: '#c9a84c' }}
                >
                    {loading ? '生成中...' : 'メニューを生成する →'}
                </button>

                {!loading && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => update({ step: 3 })}
                            className="text-[10px] tracking-wider"
                            style={{ color: 'rgba(240,236,228,0.18)' }}
                        >
                            ← テンプレート選択に戻る
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}