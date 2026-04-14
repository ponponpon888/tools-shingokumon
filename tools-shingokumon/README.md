# tools-shingokumon

お店のための無料AIツール集

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定してください。

```bash
cp .env.local.example .env.local
```

必要な値：
- `NEXT_PUBLIC_SUPABASE_URL` : SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` : Supabase Service Role Key
- `RESEND_API_KEY` : Resend APIキー
- `ANTHROPIC_API_KEY` : Claude APIキー
- `CRON_SECRET` : Vercel Cron認証用の任意の文字列

### 3. Supabaseセットアップ

Supabase SQL Editorに `supabase/schema.sql` の内容を貼り付けて実行してください。

### 4. 開発サーバー起動

```bash
npm run dev
```

## デプロイ（Vercel）

1. GitHubにpush
2. Vercelでプロジェクトをimport
3. 環境変数を設定
4. デプロイ

## ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── tools/menu/
│   │   │   ├── ocr/        # 写真→テキスト変換（Claude Vision）
│   │   │   └── generate/   # 翻訳→DB保存→メール送信
│   │   └── cron/
│   │       ├── step-emails/  # ステップメール配信（毎日2時）
│   │       └── cleanup-pdfs/ # PDF削除（毎日3時）
│   ├── tools/menu/          # ツール画面（5ステップ）
│   └── page.tsx             # トップページ
├── components/
│   ├── layout/              # Nav, Hero, TrustBar, ToolsSection, Footer
│   ├── tool/                # MenuTool, StepBar, Step1〜5
│   └── ui/                  # GeoBg
├── lib/
│   └── supabase.ts          # Supabaseクライアント
└── types/
    └── database.ts          # 型定義
```
