'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav
      className="relative z-10 flex items-center justify-between border-b px-8 md:px-12"
      style={{
        height: '60px',
        borderColor: 'rgba(201,168,76,0.08)',
        background: 'rgba(8,8,8,0.95)',
      }}
    >
      {/* ロゴ */}
      <div>
        <div className="text-xs font-medium tracking-widest text-cream">TOOLS.SHINGOKUMON</div>
        <div className="text-[9px] tracking-wider" style={{ color: 'rgba(201,168,76,0.4)' }}>
          SERVICE AI TOOLS FOR JAPAN
        </div>
      </div>

      {/* デスクトップナビ */}
      <div className="hidden items-center gap-6 md:flex">
        <a href="#tools" className="text-xs tracking-wider" style={{ color: 'rgba(240,236,228,0.35)' }}>
          ツール一覧
        </a>
        <a
          href="https://www.shingokumon.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs tracking-wider"
          style={{ color: 'rgba(240,236,228,0.35)' }}
        >
          shingokumon.com
        </a>
        <a
          href="https://musubu-lp.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="border px-4 py-2 text-xs tracking-wider"
          style={{ borderColor: 'rgba(201,168,76,0.25)', color: '#c9a84c' }}
        >
          MUSUBUデモ
        </a>
      </div>

      {/* ハンバーガー（モバイル） */}
      <button
        className="flex flex-col gap-1 p-1 md:hidden"
        onClick={() => setOpen(!open)}
        aria-label="メニュー"
      >
        <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.6)' }} />
        <span className="block h-px w-4" style={{ background: 'rgba(201,168,76,0.6)' }} />
        <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.6)' }} />
      </button>

      {/* モバイルメニュー */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 w-full border-b px-8 py-6"
          style={{
            background: '#0a0a0a',
            borderColor: 'rgba(201,168,76,0.08)',
          }}
        >
          <div className="flex flex-col gap-4">
            <a
              href="#tools"
              className="text-sm tracking-wider"
              style={{ color: 'rgba(240,236,228,0.55)' }}
              onClick={() => setOpen(false)}
            >
              ツール一覧
            </a>
            <a
              href="https://www.shingokumon.com"
              className="text-sm tracking-wider"
              style={{ color: 'rgba(240,236,228,0.55)' }}
            >
              shingokumon.com
            </a>
            <a
              href="https://musubu-lp.vercel.app"
              className="text-sm tracking-wider"
              style={{ color: '#c9a84c' }}
            >
              MUSUBUデモを見る →
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
