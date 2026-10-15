import type { Metadata } from 'next'
import './globals.css'

// ツールは停止中なので、タイトルも説明も提供中のものとして書かない。
// 検索結果と SNS カードに「無料作成」が出続けるのを避ける。
export const metadata: Metadata = {
  title: 'tools.shingokumon.com（停止中）',
  description:
    'お店向けのAIツールを公開していましたが、現在は停止しています。コードと設計は参照用に公開しています。',
  openGraph: {
    title: 'tools.shingokumon.com（停止中）',
    description:
      'お店向けのAIツールを公開していましたが、現在は停止しています。コードと設計は参照用に公開しています。',
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
