import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'お店のための無料AIツール | tools.shingokumon.com',
  description:
    '飲食・旅館・美容サロン向け。多言語メニューPDF作成・Google口コミ返信・集客診断など、現場で使えるAIツールを無料で提供。',
  openGraph: {
    title: 'お店のための無料AIツール',
    description: '日本語のメニューを入れるだけ。英語・中国語・韓国語の多言語メニューPDFを無料作成。',
    siteName: 'tools.shingokumon.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
