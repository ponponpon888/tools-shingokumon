import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MissingApiKeyError } from '@/lib/errors'
import type { Database } from '@/types/database'

/**
 * クライアントはモジュール読み込み時ではなく、呼ばれたときに作る。
 * トップレベルで作ると、環境変数の無い環境（CI のビルドやテスト）で
 * import した瞬間に `supabaseUrl is required` で落ちる。
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new MissingApiKeyError(name)
  }
  return value
}

/** ブラウザから使う anon キーのクライアント。 */
export const createBrowserClient = (): SupabaseClient<Database> =>
  createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )

/** サーバーサイド専用（API Route・cron 内でのみ使用）。 */
export const createServiceClient = (): SupabaseClient<Database> =>
  createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )
