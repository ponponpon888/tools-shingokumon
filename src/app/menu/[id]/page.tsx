import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import MenuDisplay from './MenuDisplay'

export const revalidate = 60

type Props = {
    params: { id: string }
}

export default async function MenuPage({ params }: Props) {
    const supabase = createServiceClient()

    const { data, error } = await supabase
        .from('menu_projects')
        .select('id, template_id, content_json, translations, selected_languages, status')
        .eq('id', params.id)
        .single() as any

    if (error || !data || data.status !== 'generated') {
        notFound()
    }

    return (
        <MenuDisplay
            id={data.id}
            templateId={data.template_id ?? 'gold'}
            contentJson={data.content_json as any}
            translations={data.translations as any}
            selectedLanguages={(data.selected_languages as string[]) ?? ['en']}
        />
    )
}