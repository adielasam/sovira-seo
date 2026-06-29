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

  try {
    // 1. Server-Side Paystack Verification
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) return { error: 'Server misconfiguration: Missing Paystack Secret Key' }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    })
    
    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return { error: 'Payment verification failed' }
    }

    // Verify the amount paid roughly matches the plan (in kobo)
    // 29000 for starter, 79000 for pro, 199000 for agency
    const amountPaid = verifyData.data.amount / 100
    if (planName === 'starter' && amountPaid < 29000) return { error: 'Invalid payment amount' }
    if (planName === 'pro' && amountPaid < 79000) return { error: 'Invalid payment amount' }
    if (planName === 'agency' && amountPaid < 199000) return { error: 'Invalid payment amount' }

    // 2. Insert or Update subscriptions table
    // We use upsert to handle upgrading an existing subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_name: planName,
        paystack_reference: reference,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }, { onConflict: 'user_id' })

    if (subError) {
      console.error('Error saving subscription:', subError)
      return { error: 'Failed to save subscription record' }
    }

    // 3. Update user_profiles plan
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ plan: planName })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating user profile:', profileError)
    }
    
    // 4. Log activity
    await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        action: 'plan_upgraded',
        details: { to_plan: planName, reference, amount: amountPaid }
      }])

    // 5. Create a notification
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
    
  } catch (err: any) {
    console.error('Paystack verification exception:', err)
    return { error: 'Internal server error during verification' }
  }
}
