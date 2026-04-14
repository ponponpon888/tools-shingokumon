'use client'

import { useState } from 'react'
import MenuPreview from '@/components/pdf/MenuPreview'
import type { ToolState } from './MenuTool'

type Props = { state: ToolState }

const NEXT_STEPS: Record<string, { label: string; href: string; primary?: boolean }[]> = {
  '美容・ネイル': [
    { label: 'LINE予約を自動化する（MUSUBU）', href: 'https://shingokumon.com/musubu', primary: true },
    { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
    { label: 'サロン向けLPをAIで作る', href: 'https://shingokumon.com' },
  ],
  'エステ': [
    { label: 'LINE予約を自動化する（MUSUBU）', href: 'https://shingokumon.com/musubu', primary: true },
    { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
    { label: 'お店のLPをAIで作る', href: 'https://shingokumon.com' },
  ],
  '旅館・ホテル': [
    { label: '多言語館内案内ページを作る', href: 'https://shingokumon.com', primary: true },
    { label: 'MotenasuOS（多言語PMS）を見る', href: 'https://shingokumon.com/motenasu' },
    { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
  ],
  '飲食・カフェ': [
    { label: '多言語対応LPを作る', href: 'https://shingokumon.com', primary: true },
    { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
    { label: '予約導線をAIで自動化する', href: 'https://shingokumon.com' },
  ],
  '整骨院・整体': [
    { label: 'AI自動応答を実装する', href: 'https://shingokumon.com', primary: true },
    { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
    { label: 'お店のLPをAIで作る', href: 'https://shingokumon.com' },
  ],
}

const DEFAULT_STEPS = [
  { label: 'LP制作・AI実装はこちら', href: 'https://shingokumon.com', primary: true },
  { label: 'Google口コミの返信文を自動生成する', href: '/tools/review' },
  { label: 'MUSUBUのデモを見る', href: 'https://shingokumon.com/musubu' },
]

export default function Step5Result({ state }: Props) {
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const content = state.generatedContent
  const shopName = state.shopName
  const templateId = state.templateId
  const email = state.email
  const industry = state.industry
  const nextSteps = NEXT_STEPS[industry] ?? DEFAULT_STEPS

  if (!content) return null

  const handleSendEmail = async () => {
    setEmailLoading(true)
    setEmailError(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, shopName, menuProjectId: state.menuProjectId, industry }),
      })
      if (!res.ok) throw new Error()
      setEmailSent(true)
    } catch {
      setEmailError('送信に失敗しました。もう一度お試しください。')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 text-center text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>
        STEP 05 — 完成
      </div>
      <div className="mb-8 text-center">
        <div className="mb-2 text-[10px] tracking-[0.2em]" style={{ color: '#c9a84c' }}>✓ 多言語メニューが完成しました</div>
        <h2 className="text-xl font-light" style={{ color: '#f0ece4' }}>{shopName}様のメニューが完成しました</h2>
        <p className="mt-1 text-xs" style={{ color: 'rgba(240,236,228,0.4)' }}>英語・中国語・韓国語に翻訳されています</p>
      </div>
      <div className="mb-8">
        <div className="mb-2 text-[9px] tracking-[0.15em]" style={{ color: 'rgba(201,168,76,0.35)' }}>プレビュー</div>
        <MenuPreview content={content} shopName={shopName} templateId={templateId} />
      </div>
      <div className="mb-8 text-center">
        <button disabled className="border px-8 py-3 text-xs tracking-widest opacity-35" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#c9a84c' }}>
          PDFをダウンロード（近日公開）
        </button>
      </div>
      <div className="mx-auto mb-8 max-w-sm border p-6" style={{ borderColor: 'rgba(201,168,76,0.1)', background: '#0a0a0a' }}>
        <div className="mb-4 text-[9px] tracking-[0.15em]" style={{ color: 'rgba(201,168,76,0.4)' }}>メールで受け取る</div>
        {emailSent ? (
          <div className="text-center text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>✓ {email} に送信しました</div>
        ) : (
          <>
            <div className="mb-3 border px-3 py-2.5 text-sm" style={{ borderColor: 'rgba(201,168,76,0.15)', color: 'rgba(240,236,228,0.6)', background: '#0f0d08' }}>{email}</div>
            {emailError && <p className="mb-3 text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>{emailError}</p>}
            <button onClick={handleSendEmail} disabled={emailLoading} className="w-full border py-2.5 text-[11px] tracking-wider transition-colors disabled:opacity-40" style={{ borderColor: 'rgba(201,168,76,0.4)', color: '#c9a84c' }}>
              {emailLoading ? '送信中...' : 'このメールに送る →'}
            </button>
            <p className="mt-2 text-center text-[10px]" style={{ color: 'rgba(240,236,228,0.18)' }}>役立つ情報もあわせてお届けします</p>
          </>
        )}
      </div>
      <div className="mx-auto max-w-sm border p-5" style={{ borderColor: 'rgba(201,168,76,0.08)', background: '#0a0a0a' }}>
        <div className="mb-1 text-[8px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>次のステップ</div>
        <div className="mb-4 text-[10px]" style={{ color: 'rgba(240,236,228,0.25)' }}>多言語メニューができたら、次はこちら</div>
        <div className="flex flex-col gap-2">
          {nextSteps.map((step) => (
            <a key={step.label} href={step.href} target={step.href.startsWith('http') ? '_blank' : undefined} rel={step.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center justify-between border px-3 py-3 text-xs transition-colors"
              style={{ borderColor: step.primary ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.08)', color: step.primary ? '#c9a84c' : 'rgba(240,236,228,0.5)', background: step.primary ? 'rgba(201,168,76,0.03)' : 'none' }}>
              {step.label}<span style={{ color: 'rgba(201,168,76,0.4)' }}>→</span>
            </a>
          ))}
        </div>
      </div>
      <div className="mt-8 text-center">
        <button onClick={() => window.location.reload()} className="text-[11px] tracking-wider" style={{ color: 'rgba(240,236,228,0.18)' }}>別のメニューを作る</button>
      </div>
    </div>
  )
}