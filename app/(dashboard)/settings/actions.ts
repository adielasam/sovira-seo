'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function updateUserPlan(reference: string, planName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Insert into subscriptions table
  const { error: subError } = await supabase
    .from('subscriptions')
    .insert([{
      user_id: user.id,
      plan_name: planName,
      paystack_reference: reference,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    }])

  if (subError) {
    console.error('Error saving subscription:', subError)
    return { error: subError.message }
  }

  // Update user_profiles plan
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ plan: planName })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating user profile:', profileError)
  }
  
  // Log activity
  await supabase
    .from('activity_logs')
    .insert([{
      user_id: user.id,
      action: 'plan_upgraded',
      details: { to_plan: planName, reference }
    }])

  // Also create a notification
  await supabase
    .from('notifications')
    .insert([{
      user_id: user.id,
      title: 'Plan Upgraded',
      message: `Welcome to the ${planName} Plan! Your features are now unlocked.`,
      type: 'success'
    }])

  revalidatePath('/settings')
  return { success: true }
}
