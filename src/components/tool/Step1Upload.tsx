'use client'

import { useRef, useState } from 'react'
import type { ToolState } from './MenuTool'

type Props = {
  state: ToolState
  update: (partial: Partial<ToolState>) => void
}

export default function Step1Upload({ state, update }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setLoading(true)

    try {
      // base64変換
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // OCR API呼び出し
      const res = await fetch('/api/tools/menu/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      })

      if (!res.ok) throw new Error('読み取りに失敗しました')

      const { content, shopName } = await res.json()

      update({
        inputMode: 'image_ocr',
        rawImageBase64: base64,
        content,
        shopName: shopName || '',
        step: 2,
      })
    } catch {
      setError('読み取りに失敗しました。別の写真で試すか、テキストで入力してください。')
    } finally {
      setLoading(false)
    }
  }

  const handleManual = () => {
    update({
      inputMode: 'manual',
      content: {
        sections: [
          {
            name_ja: 'メニュー',
            name_en: '',
            name_zh: '',
            name_ko: '',
            sort_order: 0,
            items: [],
          },
        ],
      },
      step: 2,
    })
  }

  return (
    <div>
      <div
        className="mb-6 text-center text-[9px] tracking-[0.2em]"
        style={{ color: 'rgba(201,168,76,0.4)' }}
      >
        STEP 01 — 写真をアップロード
      </div>

      <div
        className="mx-auto flex max-w-md flex-col items-center gap-4 border border-dashed px-8 py-12"
        style={{ borderColor: 'rgba(201,168,76,0.18)' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {/* アイコン */}
        <div
          className="flex h-12 w-12 items-center justify-center border"
          style={{ borderColor: 'rgba(201,168,76,0.18)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="3" width="18" height="14" rx="1" stroke="#c9a84c" strokeWidth="1" />
            <circle cx="6.5" cy="9" r="1.5" stroke="#c9a84c" strokeWidth="1" />
            <path d="M1 15l4.5-4.5L9 14l4-5 5 6" stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="text-sm font-light" style={{ color: '#f0ece4' }}>
          メニュー表の写真をアップロード
        </p>
        <p
          className="text-center text-xs leading-relaxed"
          style={{ color: 'rgba(240,236,228,0.3)' }}
        >
          スマホ撮影・手書き・印刷物すべて対応。
          <br />
          飲食・旅館・サロン・エステなど業種不問。
        </p>

        {loading ? (
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 animate-spin rounded-full border border-t-transparent"
              style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }}
            />
            <span className="text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>
              AIが読み取り中...
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="border px-7 py-3 text-[11px] tracking-widest transition-colors"
              style={{ borderColor: 'rgba(201,168,76,0.4)', color: '#c9a84c' }}
            >
              写真を選ぶ →
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </>
        )}

        {error && (
          <p className="text-center text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
            {error}
          </p>
        )}
      </div>

      {/* フォールバック */}
      <div className="mt-6 text-center">
        <button
          onClick={handleManual}
          className="text-[10px] tracking-wider"
          style={{ color: 'rgba(240,236,228,0.2)' }}
        >
          または テキストで直接入力する
        </button>
      </div>

      {/* 注記 */}
      <div
        className="mt-4 flex items-center justify-center gap-3 text-[10px]"
        style={{ color: 'rgba(240,236,228,0.2)' }}
      >
        <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.15)' }} />
        読み取り失敗時は別の写真で再試行できます
        <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.15)' }} />
      </div>
    </div>
  )
}
