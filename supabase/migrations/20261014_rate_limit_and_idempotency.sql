-- ============================================================
-- レート制限と冪等性のための追加 DDL
--
-- このファイルは「提示」です。アプリから自動適用はしません。
-- Supabase SQL Editor に貼り付けて、内容を確認してから実行してください。
--
-- 影響: 既存行の更新・削除はありません。追加のみです。
-- ロールバック手順はファイル末尾のコメントにあります。
-- ============================================================

-- ------------------------------------------------------------
-- 1) レート制限のカウント用テーブル
--    1 リクエスト 1 行。IP とメールは sha256 にして保存し、生の値は入れない。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  subject_type text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 件数を数えるクエリ（bucket + subject_type + subject + created_at >= ?）用
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON public.rate_limit_events (bucket, subject_type, subject, created_at DESC);

-- 古い行の一括削除用（cleanup-pdfs cron が 7 日より古い行を消す）
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at
  ON public.rate_limit_events (created_at);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY は IF NOT EXISTS を取れないため存在確認してから作る
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_events'
      AND policyname = 'rate_limit_events_service'
  ) THEN
    CREATE POLICY rate_limit_events_service
      ON public.rate_limit_events FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) 同じ入力の再送で shops / menu_projects を二重作成しないための列
--    同じ入力なら同じ値になる sha256。NULL の行は制約の対象外。
-- ------------------------------------------------------------
ALTER TABLE public.menu_projects
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_projects_request_fingerprint
  ON public.menu_projects (request_fingerprint)
  WHERE request_fingerprint IS NOT NULL;

-- ------------------------------------------------------------
-- 3) コードが前提にしている列
--    本番には既にある想定。schema.sql に記載が漏れていたため、
--    無い環境でだけ追加されるようにしてある。
-- ------------------------------------------------------------
ALTER TABLE public.menu_projects
  ADD COLUMN IF NOT EXISTS translations jsonb;

ALTER TABLE public.menu_projects
  ADD COLUMN IF NOT EXISTS selected_languages text[];

-- ============================================================
-- ロールバック（必要になったときに手で実行する）
--
--   DROP INDEX IF EXISTS public.uq_menu_projects_request_fingerprint;
--   ALTER TABLE public.menu_projects DROP COLUMN IF EXISTS request_fingerprint;
--   DROP TABLE IF EXISTS public.rate_limit_events;
--
-- 2) を戻すと冪等性チェックが効かなくなり、1) を戻すと公開 API が
-- 503 を返すようになります（レート制限が数えられないときは通さない設計）。
--
-- translations / selected_languages は本番で使用中のため、戻しません。
-- ============================================================
