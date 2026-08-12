import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicChatInterface from '@/components/PublicChatInterface'

export default async function PublicChatbotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch bot details using admin client because viewers are anonymous
  const adminSupabase = createAdminClient()
    const { data: bot, error } = await adminSupabase
      .from('chatbots')
      .select('name, theme_color, bot_avatar')
      .eq('id', id)
      .single()

  if (error || !bot) {
    return notFound()
  }

  return (
    <PublicChatInterface 
      botId={id} 
      name={bot.name} 
      themeColor={bot.theme_color || '#2563eb'} 
      botAvatar={bot.bot_avatar}
    />
  )
}
