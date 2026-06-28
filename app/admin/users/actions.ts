'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserSuspension(userId: string, currentRole: string) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: adminProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
    return { success: false, error: 'Unauthorized' }
  }

  const newRole = currentRole === 'suspended' ? 'user' : 'suspended'

  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error('Error suspending user:', error)
    return { success: false, error: 'Failed to update user status.' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
