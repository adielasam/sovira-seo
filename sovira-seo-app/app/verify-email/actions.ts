'use server'

import { createClient } from '@/lib/supabase/server'

export async function resendVerificationEmail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !user.email) return { error: 'User not found' }
  
  // Rate limiting could be enforced at the server level here, 
  // but for simplicity we rely on Supabase's built-in resend rate limit
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    }
  })
  
  if (error) {
    // If Supabase hits a rate limit (usually 60 seconds), it throws an error
    return { error: error.message }
  }
  
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
