export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Industry =
  | '飲食・カフェ'
  | '旅館・ホテル'
  | '美容・ネイル'
  | 'エステ'
  | '整骨院・整体'
  | 'その他'

export type MenuStatus =
  | 'draft'
  | 'processing'
  | 'generated'
  /** DB には入ったが、完成メールをまだ送れていない。 */
  | 'email_pending'
  /** 完成メールの送信に失敗した。再送の対象。 */
  | 'email_failed'
  | 'failed'
  | 'expired'

export type InputMode = 'manual' | 'image_ocr'
export type AssetType = 'pdf_print' | 'pdf_qr' | 'logo' | 'image_preview'
export type Channel = 'email' | 'line' | 'whatsapp'
export type EventType =
  | 'deliver_pdf'
  | 'nurture_1'
  | 'nurture_2'
  | 'nurture_3'
  | 'nurture_4'
  | 'reengagement'
  | 'bounce'
  | 'unsubscribe'
export type MessageStatus = 'queued' | 'sent' | 'failed' | 'bounced'

export interface MenuContent {
  sections: MenuSection[]
}

export interface MenuSection {
  name_ja: string
  name_en: string
  name_zh: string
  name_ko: string
  sort_order: number
  items: MenuItem[]
}

export interface MenuItem {
  name_ja: string
  name_en: string
  name_zh: string
  name_ko: string
  price: number
  currency: string
  tax_included: boolean
}

/**
 * Supabase のスキーマ型。
 *
 * 本来は `supabase gen types typescript` の出力を貼るべきもので、
 * ログインが必要なためここでは手で書いている。生成し直すコマンドは README を参照。
 * `Views` / `Functions` / `Relationships` が無いと supabase-js が全テーブルを
 * `never` に落とすため、空でも必ず置いておく。
 */
export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          email: string
          line_user_id: string | null
          unsubscribed: boolean
          consent_marketing: boolean
          source_tool_first: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          current_nurture_step: number
          last_contacted_at: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          line_user_id?: string | null
          unsubscribed?: boolean
          consent_marketing?: boolean
          source_tool_first?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          current_nurture_step?: number
          last_contacted_at?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          contact_id: string | null
          shop_name: string
          industry: string | null
          industry_other: string | null
          default_locale: string
          logo_storage_path: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          shop_name: string
          industry?: string | null
          industry_other?: string | null
          default_locale?: string
          logo_storage_path?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'shops_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          }
        ]
      }
      menu_projects: {
        Row: {
          id: string
          shop_id: string | null
          template_id: string
          input_mode: InputMode | null
          content_json: MenuContent
          translations: Json | null
          selected_languages: string[] | null
          /** 同じ入力の再送を見分けるためのハッシュ。UNIQUE。 */
          request_fingerprint: string | null
          status: MenuStatus
          expires_at: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id?: string | null
          template_id: string
          input_mode?: InputMode | null
          content_json: MenuContent
          translations?: Json | null
          selected_languages?: string[] | null
          request_fingerprint?: string | null
          status?: MenuStatus
          expires_at: string
          updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['menu_projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'menu_projects_shop_id_fkey'
            columns: ['shop_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id']
          }
        ]
      }
      assets: {
        Row: {
          id: string
          menu_project_id: string | null
          asset_type: AssetType
          storage_bucket: string
          storage_path: string
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          menu_project_id?: string | null
          asset_type: AssetType
          storage_bucket?: string
          storage_path: string
          mime_type?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'assets_menu_project_id_fkey'
            columns: ['menu_project_id']
            isOneToOne: false
            referencedRelation: 'menu_projects'
            referencedColumns: ['id']
          }
        ]
      }
      message_events: {
        Row: {
          id: string
          contact_id: string | null
          menu_project_id: string | null
          channel: Channel
          event_type: EventType
          status: MessageStatus
          provider: string
          provider_message_id: string | null
          error_message: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          contact_id?: string | null
          menu_project_id?: string | null
          channel: Channel
          event_type: EventType
          status: MessageStatus
          provider?: string
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string
        }
        Update: Partial<Database['public']['Tables']['message_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'message_events_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_events_menu_project_id_fkey'
            columns: ['menu_project_id']
            isOneToOne: false
            referencedRelation: 'menu_projects'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 別プロジェクトと共用している問い合わせテーブル。
       * このリポジトリに DDL は無く、列はステップメール配信で使う範囲だけ書いている。
       */
      inbound_contacts: {
        Row: {
          id: string
          email: string
          name: string | null
          company: string | null
          contact_type: string | null
          status: string | null
          meta: { industry?: string | null } | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          company?: string | null
          contact_type?: string | null
          status?: string | null
          meta?: { industry?: string | null } | null
          updated_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['inbound_contacts']['Insert']>
        Relationships: []
      }
      /** レート制限のカウント用。1 リクエスト 1 行。 */
      rate_limit_events: {
        Row: {
          id: number
          bucket: string
          subject_type: string
          /** IP やメールの sha256。生の値は保存しない。 */
          subject: string
          created_at: string
        }
        Insert: {
          id?: number
          bucket: string
          subject_type: string
          subject: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rate_limit_events']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
