# tools-shingokumon

> **停止中 — このツールは現在動きません。**
> バックエンドの Supabase プロジェクトを終了したため、OCR と生成の API は 503 を返します。
> コードと設計は参照用に公開しています。以下の説明は、停止前に実装されていた内容です。

> **Out of service — this tool does not run.**
> The backing Supabase project has been shut down, so the OCR and generation APIs return 503.
> The code and design stay public for reference. Everything below describes the tool as it was built.

お店向けの無料 AI ツール集。メニュー表の写真を Claude Vision で読み取り、多言語に翻訳して、閲覧用の URL と QR コードをメールで届ける Next.js アプリです。

## 何ができるか

多言語メニュー作成ツール（`/tools/menu`）が 5 ステップで動きます。

1. メニュー表の写真をアップロード（または手入力）
2. 読み取り結果を確認・編集
3. デザインを選ぶ（8 種類）
4. 翻訳する言語を選ぶ（英語・中国語簡体字・韓国語）
5. メールアドレスを入れて生成 → 公開 URL と QR コードを受け取る

生成されたメニューは `/menu/{id}` で公開され、来店客が言語を切り替えて見られます。品目ごとに注文フレーズを出す機能もあります（`/api/menu/chat`）。

## 技術構成

| 役割 | 使っているもの |
| --- | --- |
| フレームワーク | Next.js 14（App Router） |
| OCR・翻訳 | Anthropic Claude API |
| DB・ストレージ | Supabase（PostgreSQL / Storage） |
| メール送信 | Resend |
| ホスティング・定期実行 | Vercel（Cron） |
| テスト | Vitest |

## セットアップ

### 1. 依存パッケージ

```bash
npm ci
```

### 2. 環境変数

`.env.local.example` をコピーして `.env.local` を作り、値を入れます。

```bash
cp .env.local.example .env.local
```

| 変数 | 必須 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ○ | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ○ | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | ○ | サーバー側からの DB 書き込み |
| `ANTHROPIC_API_KEY` | ○ | OCR・翻訳 |
| `RESEND_API_KEY` | ○ | メール送信 |
| `RESEND_FROM_EMAIL` | | 差出人。未設定なら `onboarding@resend.dev` |
| `NEXT_PUBLIC_APP_URL` | | メール内リンクの基点。未設定なら本番 URL |
| `CRON_SECRET` | ○ | Cron ルートの認証。未設定だと Cron は 503 |
| `OCR_MODEL` | | OCR のモデル。未設定なら `claude-opus-4-5` |
| `TRANSLATION_MODEL` | | 翻訳のモデル。未設定なら `claude-haiku-4-5-20251001` |
| `RATE_LIMIT_OCR_IP_PER_HOUR` | | 既定 5 |
| `RATE_LIMIT_OCR_GLOBAL_PER_DAY` | | 既定 50（全体） |
| `RATE_LIMIT_GENERATE_IP_PER_HOUR` | | 既定 5 |
| `RATE_LIMIT_GENERATE_EMAIL_PER_DAY` | | 既定 3 |
| `RATE_LIMIT_GENERATE_GLOBAL_PER_DAY` | | 既定 100（全体） |
| `RATE_LIMIT_CHAT_IP_PER_HOUR` | | 既定 20 |
| `RATE_LIMIT_CHAT_GLOBAL_PER_DAY` | | 既定 500（全体） |

全体の上限（`*_GLOBAL_PER_DAY`）は、1 つの IP からの連打ではなく、分散したアクセス全体で API 費用が伸びるのを止めるためのものです。既定値は仮置きなので、実際の利用に合わせて変えてください。

API キーは Vercel の環境変数に入れ、リポジトリにはコミットしません。

### 3. Supabase

初回は `supabase/schema.sql` を Supabase SQL Editor に貼って実行します。

既存のプロジェクトに追加で当てる DDL は `supabase/migrations/` にあります。**このリポジトリから自動適用はしません。** 内容を確認してから SQL Editor で手で実行してください。各ファイルの末尾にロールバック手順をコメントで書いています。

`src/types/database.ts` は現在手書きです。Supabase にログインできる環境なら、生成し直せます。

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > src/types/database.ts
```

生成した型には `MenuContent` などのドメイン型が含まれないため、差し替える場合はそれらを別ファイルに移してください。

### 4. 起動

```bash
npm run dev
```

ローカルでは `x-forwarded-for` が付かないため、レート制限は `unknown` という共有カウンタに入ります。開発中に引っかかる場合は `.env.local` で `RATE_LIMIT_*` を大きくしてください。

## 検査

```bash
npm run lint       # ESLint（next/core-web-vitals）
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run build      # 本番ビルド
```

テストは外部へ通信しません。Anthropic・Resend・Supabase を呼ぶ処理は差し替え可能にしてあり、検証・エスケープ・冪等性キー・レート制限の判定・OCR 応答のパースだけを対象にしています。

## 公開 API の扱い

`/api/tools/menu/ocr`、`/api/tools/menu/generate`、`/api/menu/chat` は認証なしで叩けるため、次の制限をかけています。

- **入力検証**: zod。画像は JPEG / PNG / WebP のみ、base64 の長さ上限あり。言語・テンプレート・品目数、質問文とメニュー文の長さも範囲を決めています
- **レート制限**: Supabase の `rate_limit_events` テーブルで数えます。IP とメールは sha256 にして保存し、生の値は入れません。IP ごと・メールごとの上限に加えて、**全体の 1 日あたりの上限**も持っています
- **記録してから数えます**: 先に 1 件記録し、自分の分を含めて数えます。逆の順序だと、同時に来たリクエストが全部まだ 0 件の状態を見て通り抜けてしまいます。この順序なら、同時に何本来ても通るのは上限の本数以下になります。代わりに、拒否されたリクエストもウィンドウの回数に数えられます
- **数えられないときは通しません**: テーブルが無い・DB 障害といった場合は 503 を返します。レート制限が効かない状態で有料 API が呼ばれるのを避けるためです
- **冪等性**: 同じ入力の再送は `menu_projects.request_fingerprint`（入力の sha256）で見分け、`shops` / `menu_projects` を二重に作りません。翻訳も呼び直しません。期限切れの行は再利用しません（`cleanup-pdfs` が `expired` にするとき `request_fingerprint` を外します）
- **送信失敗の扱い**: メール送信に失敗しても 500 にはせず、`menu_projects.status` を `email_failed` にして `message_events` に理由を残します。メニュー自体は URL で見られます

## ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── tools/menu/
│   │   │   ├── ocr/        # 写真 → テキスト（Claude Vision）
│   │   │   └── generate/   # 翻訳 → DB 保存 → メール送信
│   │   ├── menu/chat/      # 公開メニューの質問・注文フレーズ
│   │   └── cron/
│   │       ├── step-emails/   # ステップメール配信（毎日 2 時）
│   │       └── cleanup-pdfs/  # 期限切れ削除（毎日 3 時）
│   ├── menu/[id]/          # 生成されたメニューの公開ページ
│   ├── tools/menu/         # ツール画面（5 ステップ）
│   └── page.tsx            # トップページ
├── components/
│   ├── layout/             # Nav, Hero, TrustBar, ToolsSection, Footer
│   ├── tool/               # MenuTool, StepBar, Step1〜5
│   └── ui/                 # GeoBg
├── lib/
│   ├── anthropic.ts        # Claude クライアントとモデル名
│   ├── day0-email.ts       # 完成メールの組み立て
│   ├── fingerprint.ts      # 冪等性のキー
│   ├── html.ts             # HTML エスケープ
│   ├── limits.ts           # サーバー・クライアント共有の上限
│   ├── menu-project.ts     # 再利用してよい状態と期限切れの扱い
│   ├── ocr-parse.ts        # OCR 応答の取り出しと復元
│   ├── rate-limit.ts       # レート制限
│   ├── resend.ts           # Resend クライアント
│   ├── supabase.ts         # Supabase クライアント
│   └── validation.ts       # zod スキーマ
└── types/
    └── database.ts         # Supabase のスキーマ型
```

## デプロイ（Vercel）

1. GitHub に push
2. Vercel でプロジェクトを import
3. 環境変数を設定
4. `supabase/migrations/` の未適用分を SQL Editor で実行
5. デプロイ

Cron は `vercel.json` で定義しています。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
