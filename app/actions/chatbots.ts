'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function createChatbotAction(name: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Use the authenticated server client instead of admin client to avoid service_role key issues.
    // Since the user is authenticated, this will pass the RLS policy.
    const { data, error } = await supabase
      .from('chatbots')
      .insert({
        name: name,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, chatbotId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal server error' }
  }
}
