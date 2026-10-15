import type { Metadata } from 'next'
import Nav from '@/components/layout/Nav'
import GeoBg from '@/components/ui/GeoBg'

// このツールは停止中です。バックエンドの Supabase プロジェクトを終了したため、
// OCR・生成・公開メニュー応答・cron の API ルートはすべて削除しました。
// Anthropic / Resend / Supabase へ出ていく経路は、デプロイ上に残っていません。
// 実装は参照用に残してあります:
//   UI        src/components/tool/MenuTool.tsx （および Step1〜Step5）
//   ロジック  src/lib/*.ts
//   API       削除済み。git 履歴に残っています
export const metadata: Metadata = {
  title: '多言語メニュー作成ツール（停止中） | tools.shingokumon.com',
  description:
    'このツールは停止中です。バックエンドの Supabase プロジェクトを終了したため、OCR と生成の API は削除しました。',
  robots: { index: false, follow: false },
}

export default function MenuToolPage() {
  return (
    <main className="relative overflow-hidden min-h-screen">
      <GeoBg />
      <Nav />

      <section className="relative z-10 mx-auto max-w-2xl px-8 py-24 md:px-12 md:py-32">
        <div
          className="mb-5 flex items-center gap-3 text-[10px] tracking-[0.2em]"
          style={{ color: 'rgba(201,168,76,0.5)' }}
        >
          <span className="block h-px w-5" style={{ background: 'rgba(201,168,76,0.25)' }} />
          停止中 / OUT OF SERVICE
        </div>

        <h1
          className="mb-8 text-2xl font-light leading-snug tracking-tight md:text-3xl"
          style={{ color: '#f0ece4' }}
        >
          多言語メニュー作成ツールは
          <br />
          現在停止しています。
        </h1>

        <div
          className="mb-8 border p-7"
          style={{ borderColor: 'rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.03)' }}
        >
          <p className="mb-4 text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.5)' }}>
            バックエンドの Supabase プロジェクトを終了したため、メニューの読み取り（OCR）と生成の
            API ルートは削除しました。新しいメニューを作ることはできません。
          </p>
          <p className="text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.5)' }}>
            再開の予定は未定です。コードと設計は参照用に公開しています。
          </p>
        </div>

        <div
          className="mb-10 border p-7"
          style={{ borderColor: 'rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.02)' }}
        >
          <p className="mb-4 text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.4)' }}>
            The backing Supabase project has been shut down, and the OCR and generation API routes
            have been removed. Creating a new menu is not possible.
          </p>
          <p className="text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.4)' }}>
            There is no restart date. The code and design stay public for reference.
          </p>
        </div>

        <a
          href="https://github.com/ponponpon888/tools-shingokumon"
          className="inline-flex items-center gap-2 border px-6 py-3 text-[11px] tracking-wider"
          style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#c9a84c' }}
        >
          ソースコードを見る / View the source
          <span className="text-sm">→</span>
        </a>
      </section>
    </main>
  )
}
