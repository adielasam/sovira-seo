'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function sendGlobalNotification(title: string, message: string, type: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify admin status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
    return { error: 'Unauthorized' }
  }

  // Use admin client to bypass RLS for inserting into notifications
  const adminClient = await createAdminClient()

  const { error } = await adminClient
    .from('notifications')
    .insert([{
      user_id: user.id,
      title,
      message,
      type,
      is_global: true
    }])

  if (error) {
    console.error('Error sending notification:', error)
    return { error: `Failed: ${error.message} ${error.details || ''}` }
  }

  return { success: true }
}
