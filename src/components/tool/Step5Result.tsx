'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
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

const MUSUBU_URL = 'https://musubu-lp.vercel.app/'
const LP_URL = 'https://www.shingokumon.com/contact'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tools-shingokumon.vercel.app'

export default function Step5Result({ state }: Props) {
  const menuUrl = state.menuProjectId
    ? `${APP_URL}/menu/${state.menuProjectId}`
    : null

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!menuUrl) return
    QRCode.toDataURL(menuUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#c9a84c',
        light: '#0f0d08',
      },
    }).then(setQrDataUrl)
  }, [menuUrl])

  const handleCopy = () => {
    if (menuUrl) {
      navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = 'menu-qr.png'
    a.click()
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
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

      {/* 不完全感ブロック */}
      <div
        className="mb-6 border p-4"
        style={{ borderColor: 'rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.04)' }}
      >
        <div className="mb-2 text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.5)' }}>
          でも、これだけでは取りこぼします
        </div>
        <div className="space-y-1">
          {[
            '外国人からの質問 → 今は全部手動対応',
            '予約のやり取り → 今は別で管理',
            '営業時間外の問い合わせ → 機会損失中',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]" style={{ color: textMuted }}>
              <span style={{ color: 'rgba(201,168,76,0.4)' }}>・</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* QRコード + URL */}
      <div
        className="mb-6 border p-6 text-center"
        style={{ borderColor: goldBorder, background: '#0f0d08' }}
      >
        {menuUrl ? (
          <>
            <div className="mb-4 text-[9px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.4)' }}>
              外国語メニューQRコード
            </div>

            {qrDataUrl ? (
              <div className="mb-4 flex justify-center">
                <img
                  src={qrDataUrl}
                  alt="Menu QR Code"
                  width={160}
                  height={160}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            ) : (
              <div className="mb-4 flex h-40 items-center justify-center">
                <span className="text-[10px]" style={{ color: textFaint }}>生成中...</span>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={handleDownloadQR}
                disabled={!qrDataUrl}
                className="border px-5 py-2 text-[10px] tracking-widest transition-colors"
                style={{ borderColor: goldActive, color: gold, opacity: qrDataUrl ? 1 : 0.4 }}
              >
                QRを保存
              </button>
              <button
                onClick={handleCopy}
                className="border px-5 py-2 text-[10px] tracking-widest transition-colors"
                style={{ borderColor: goldBorder, color: copied ? gold : textMuted }}
              >
                {copied ? 'コピー済み ✓' : 'URLをコピー'}
              </button>
            </div>

            <div
              className="mt-3 break-all text-[10px]"
              style={{ color: textFaint }}
            >
              {menuUrl}
            </div>
          </>
        ) : (
          <p className="text-[11px]" style={{ color: textMuted }}>
            メニューページは近日公開予定です。
          </p>
        )}
      </div>

      {/* CTA：ストーリー化 */}
      <div
        className="mb-3 text-center text-[9px] tracking-[0.2em]"
        style={{ color: 'rgba(201,168,76,0.4)' }}
      >
        外国人対応を完結させる
      </div>

      <div className="space-y-3">
        <a
          href={menuUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-4 border p-4 transition-colors"
          style={{ borderColor: goldActive, background: goldFaint }}
        >
          <div className="shrink-0 text-[10px] tracking-widest" style={{ color: gold }}>STEP 1</div>
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              QRをテーブル・看板に貼る
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              外国人がスキャンするだけで多言語メニューを見られます
            </div>
          </div>
          <span className="text-xs" style={{ color: gold }}>→</span>
        </a>

        <a
          href={MUSUBU_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-4 border p-4 transition-colors"
          style={{ borderColor: goldBorder, background: goldFaint }}
        >
          <div className="shrink-0 text-[10px] tracking-widest" style={{ color: gold }}>STEP 2</div>
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              外国人の質問・予約をAIで自動化する
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              24時間・多言語対応。手動確認なしで予約・問い合わせが完結します
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
          <div className="shrink-0 text-[10px] tracking-widest" style={{ color: gold }}>STEP 3</div>
          <div className="flex-1">
            <div className="text-[11px] font-light" style={{ color: textPrimary }}>
              外国人向けの集客まで自動化する
            </div>
            <div className="mt-1 text-[10px]" style={{ color: textMuted }}>
              多言語LP・SEO対応で、外国人客が自然に集まる仕組みを作ります
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