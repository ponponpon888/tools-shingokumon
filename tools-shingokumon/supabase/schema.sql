-- ============================================================
-- tools.shingokumon.com — Supabase Schema
-- Supabase SQL Editorにそのまま貼り付けて実行してください
-- ============================================================

-- ① contacts（人・連絡先）
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  line_user_id text,
  unsubscribed bool DEFAULT false,
  consent_marketing bool DEFAULT false,
  source_tool_first text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  current_nurture_step int DEFAULT 0,
  last_contacted_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ② shops（店舗情報）
CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  industry text,
  industry_other text,
  default_locale text DEFAULT 'ja',
  logo_storage_path text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ③ menu_projects（メニュー生成案件）
CREATE TABLE menu_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  input_mode text,
  content_json jsonb NOT NULL,
  status text DEFAULT 'draft',
  expires_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ④ assets（生成ファイル管理）
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_project_id uuid REFERENCES menu_projects(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'menu-assets',
  storage_path text NOT NULL,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- ⑤ message_events（送信履歴）
CREATE TABLE message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  menu_project_id uuid REFERENCES menu_projects(id) ON DELETE SET NULL,
  channel text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL,
  provider text DEFAULT 'resend',
  provider_message_id text,
  error_message text,
  sent_at timestamptz DEFAULT now()
);

-- updated_at 自動更新 trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_upd
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shops_upd
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menu_projects_upd
  BEFORE UPDATE ON menu_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 有効化
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;

-- 全テーブル service_role のみ（Edge Function経由）
CREATE POLICY contacts_service ON contacts FOR ALL TO service_role USING (true);
CREATE POLICY shops_service ON shops FOR ALL TO service_role USING (true);
CREATE POLICY menu_projects_service ON menu_projects FOR ALL TO service_role USING (true);
CREATE POLICY assets_service ON assets FOR ALL TO service_role USING (true);
CREATE POLICY message_events_service ON message_events FOR ALL TO service_role USING (true);

-- インデックス
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_nurture ON contacts(current_nurture_step, created_at) WHERE unsubscribed = false;
CREATE INDEX idx_menu_projects_status ON menu_projects(status, expires_at);
CREATE INDEX idx_message_events_contact ON message_events(contact_id, event_type);
