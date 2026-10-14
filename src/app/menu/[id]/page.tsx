import type { ComponentProps } from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { MenuStatus } from '@/types/database'
import MenuDisplay from './MenuDisplay'

// content_json / translations は jsonb なので、表示側の型に合わせる所でだけ変換する。
type MenuDisplayProps = ComponentProps<typeof MenuDisplay>

export const revalidate = 60

type Props = {
    params: { id: string }
}

/**
 * 公開して良い状態。
 * メールの送信に失敗していても、メニュー自体は見られるようにする。
 */
const VIEWABLE_STATUSES: MenuStatus[] = ['generated', 'email_pending', 'email_failed']

export default async function MenuPage({ params }: Props) {
    const supabase = createServiceClient()

    const { data, error } = await supabase
        .from('menu_projects')
        .select('id, template_id, content_json, translations, selected_languages, status')
        .eq('id', params.id)
        .maybeSingle()

    if (error) {
        console.error('MenuPage: load failed:', error.message)
        notFound()
    }

    if (!data || !VIEWABLE_STATUSES.includes(data.status)) {
        notFound()
    }

    return (
        <MenuDisplay
            id={data.id}
            templateId={data.template_id ?? 'gold'}
            contentJson={data.content_json as MenuDisplayProps['contentJson']}
            translations={(data.translations ?? {}) as MenuDisplayProps['translations']}
            selectedLanguages={data.selected_languages ?? ['en']}
        />
    )
}
