'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function createChatbotAction(name: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Use admin client to bypass RLS issues securely since we already validated the user ID
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
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
