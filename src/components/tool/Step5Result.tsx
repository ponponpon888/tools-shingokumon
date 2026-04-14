'use client'

import type { ToolState } from './MenuTool'

type Props = {
  state: ToolState
}

const gold = '#c9a84c'
const goldFaint = 'rgba(201,168,76,0.08)'
const goldBorder = 'rgba(201,168,76,0.15)'
const goldActive = 'rgba(201,168,76,0.45)'
const textPrimary = '#f0ece4'
const textMuted = 'rgba(240,236,228,0.45)'
const textFaint = 'rgba(240,236,228,0.25)'

const MUSUBU_URL = 'https://musubu.shingokumon.com'
const LP_URL = 'https://shingokumon.com/contact'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tools.shingokumon.com'

export default function Step5Result({ state }: Props) {
  const menuUrl = state.menuProjectId
    ? `${APP_URL}/menu/${state.menuProjectId}`
    : null

  const handleCopy = () => {
    if (menuUrl) {
      navigator.clipboard.writeText(menuUrl)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <div className="mb-2 text-[9px] tracking-[0.25em]" style={{ color: 'rgba(201,168,76,0.45)' }}>
          STEP 05
        </div>
        <h2 className="text-base font-light" style={{ color: textPrimary }}>
          メニューが完成しました
        </h2>
        <p className="mt-2 text-xs" style={{ color: textMuted }}>
          {state.email} にメールをお送りしました
        </p>
      </div>

      {/* QRコード / URL（menu/{id}実装後に有効化） */}
      <div
        className="mb-6 border p-6 text-center"
        style={{ borderColor: goldBorder, background: '#0f0d08' }}
      >
        {menuUrl ? (
          <>
            <div className="mb-3 text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>
              メニューURL
            </div>
            <div
              className="mb-4 break-all text-[11px]"
              style={{ color: textMuted }}
            >
              {menuUrl}
            </div>
            <button
              onClick={handleCopy}
              className="border px-6 py-2 text-[10px] tracking-widest transition-colors"
              style={{ borderColor: goldActive, color: gold }}
            >
              URLをコピーする
            </button>
            <p className="mt-3 text-[10px]" style={{ color: textFaint }}>
              このURLをお客様にお伝えください。QRコードは近日公開予定です。
            </p>
          </>
        ) : (
          <p className="text-[11px]" style={{ color: textMuted }}>
            メニューページは近日公開予定です。
          </p>
        )}
      </div>

      {/* スクリーンショット案内 */}
      <div
        className="mb-8 border p-4 text-center text-[10px]"
        style={{ borderColor: 'rgba(255,255,255,0.06)', color: textFaint }}
      >
        この画面をスクリーンショットまたは印刷で保存することもできます。
        <br />
        PDF版は近日公開予定です。
      </div>

      {/* 3択 CTA */}
      <div
        className="mb-3 text-[9px] tracking-[0.2em] text-center"
        style={{ color: 'rgba(201,168,76,0.4)' }}
      >
        このメニューをもっと活かすには
      </div>

      <div className="space-y-3">
        <a
          href={`${APP_URL}/menu/${state.menuProjectId ?? ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-4 border p-4 transition-colors"
          style={{ borderColor: goldBorder, background: goldFaint }}
          onClick={(e) => { if (!state.menuProjectId) e.preventDefault() }}
        >
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              QRで外国人対応を完成させる
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              テーブルや看板にQRを貼るだけで外国語メニューに対応できます
            </div>
          </div>
          <span className="text-xs" style={{ color: gold }}>→</span>
        </a>

        <a
          href={MUSUBU_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-4 border p-4 transition-colors"
          style={{ borderColor: goldActive, background: goldFaint }}
        >
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              LINE予約を自動化する
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              24時間AIが予約対応。電話・手動確認なしで予約が入ります
            </div>
          </div>
          <span className="text-xs" style={{ color: gold }}>→</span>
        </a>

        <a
          href={LP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-4 border p-4 transition-colors"
          style={{ borderColor: goldBorder, background: goldFaint }}
        >
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              外国人向けLPを作る
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              多言語対応のランディングページで集客力を高めます
            </div>
          </div>
          <span className="text-xs" style={{ color: gold }}>→</span>
        </a>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[10px]" style={{ color: textFaint }}>
          Powered by{' '}
          <a
            href="https://shingokumon.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(201,168,76,0.4)' }}
          >
            shingokumon.com
          </a>
        </p>
      </div>
    </div>
  )
}