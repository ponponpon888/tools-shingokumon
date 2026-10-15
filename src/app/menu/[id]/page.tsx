import type { Metadata } from 'next'
import Nav from '@/components/layout/Nav'
import GeoBg from '@/components/ui/GeoBg'

// 公開メニューの表示は停止しました。バックエンドの Supabase プロジェクトを終了したため、
// 生成済みのメニューも読み出せません。完成メールのリンク先がここなので、404 やエラー画面
// ではなく、理由の分かる案内を返します。
// 表示の実装は参照用にそのまま残してあります: ./MenuDisplay.tsx
// その実装が叩いていた注文フレーズの API（/api/menu/chat）も削除済みです。
//
// Supabase は読みません。id は URL に残りますが、何にも使いません。
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'このメニューは閲覧できません | tools.shingokumon.com',
  description: 'バックエンドを終了したため、生成済みのメニューも表示できなくなりました。',
  robots: { index: false, follow: false },
}

export default function MenuPage() {
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
          閲覧できません / NO LONGER AVAILABLE
        </div>

        <h1
          className="mb-8 text-2xl font-light leading-snug tracking-tight md:text-3xl"
          style={{ color: '#f0ece4' }}
        >
          このメニューは
          <br />
          閲覧できません。
        </h1>

        <div
          className="mb-8 border p-7"
          style={{ borderColor: 'rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.03)' }}
        >
          <p className="mb-4 text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.5)' }}>
            バックエンドを終了したため、生成済みのメニューも表示できなくなりました。
            お手元のメールに残っている URL も、同じようにこの案内が出ます。
          </p>
          <p className="text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.5)' }}>
            再開の予定は未定です。ご不便をおかけします。
          </p>
        </div>

        <div
          className="mb-10 border p-7"
          style={{ borderColor: 'rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.02)' }}
        >
          <p className="mb-4 text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.4)' }}>
            This menu is no longer available. The backend has been shut down, so menus that were
            already generated can no longer be displayed either. Links saved from the original
            email now land on this notice.
          </p>
          <p className="text-sm leading-loose" style={{ color: 'rgba(240,236,228,0.4)' }}>
            There is no restart date. Sorry for the inconvenience.
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
