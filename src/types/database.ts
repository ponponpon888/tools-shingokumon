export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Industry =
  | '飲食・カフェ'
  | '旅館・ホテル'
  | '美容・ネイル'
  | 'エステ'
  | '整骨院・整体'
  | 'その他'

export type MenuStatus = 'draft' | 'processing' | 'generated' | 'failed' | 'expired'
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

export interface Database {
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
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'updated_at' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }
      shops: {
        Row: {
          id: string
          contact_id: string
          shop_name: string
          industry: Industry | null
          industry_other: string | null
          default_locale: string
          logo_storage_path: string | null
          updated_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shops']['Row'], 'id' | 'updated_at' | 'created_at'>
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
      }
      menu_projects: {
        Row: {
          id: string
          shop_id: string
          template_id: string
          input_mode: InputMode | null
          content_json: MenuContent
          translations: Json | null
          selected_languages: string[] | null
          status: MenuStatus
          expires_at: string
          updated_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_projects']['Row'], 'id' | 'updated_at' | 'created_at'>
        Update: Partial<Database['public']['Tables']['menu_projects']['Insert']>
      }
      assets: {
        Row: {
          id: string
          menu_project_id: string
          asset_type: AssetType
          storage_bucket: string
          storage_path: string
          mime_type: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
      }
      message_events: {
        Row: {
          id: string
          contact_id: string
          menu_project_id: string | null
          channel: Channel
          event_type: EventType
          status: MessageStatus
          provider: string
          provider_message_id: string | null
          error_message: string | null
          sent_at: string
        }
        Insert: Omit<Database['public']['Tables']['message_events']['Row'], 'id' | 'sent_at'>
        Update: Partial<Database['public']['Tables']['message_events']['Insert']>
      }
    }
  }
}