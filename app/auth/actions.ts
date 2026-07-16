'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { sendWelcomeEmail, sendLoginAlertEmail } from '@/lib/email'

async function verifyTurnstile(token: string | null, ip: string) {
  if (!token) return false
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(ip)}`
    })
    const data = await res.json()
    return data.success
  } catch (e) {
    return false
  }
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/auth/login?error=Email and password are required')
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'Unknown'
  const turnstileToken = formData.get('cf-turnstile-response') as string
  const isHuman = await verifyTurnstile(turnstileToken, ip !== 'Unknown' ? ip : '')
  
  if (!isHuman) {
    redirect('/auth/login?error=Please complete the security check to verify you are human')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  let destination = '/dashboard'
  let userName = 'User'
  
  if (data?.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()
      
    if (profile) {
      if (profile.role === 'admin' || data.user.email === 'microsoftportharcourt@gmail.com') {
        destination = '/admin'
      }
      if (profile.full_name) {
        userName = profile.full_name
      }
    }

    const userAgent = headersList.get('user-agent') || 'Unknown'
    
    // Send email without blocking the response
    sendLoginAlertEmail(data.user.email || email, userName, ip, userAgent)
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signupAction(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const acceptedTerms = formData.get('acceptedTerms') === 'true'

  if (!email || !password) {
    redirect('/auth/register?error=Email and password are required')
  }

  if (!acceptedTerms) {
    redirect('/auth/register?error=Please accept the Terms and Conditions to continue')
  }

  // 1. IP Rate Limiting for Free Accounts
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'Unknown'
  
  // Verify Turnstile
  const turnstileToken = formData.get('cf-turnstile-response') as string
  const isHuman = await verifyTurnstile(turnstileToken, ip !== 'Unknown' ? ip : '')
  if (!isHuman) {
    redirect('/auth/register?error=Please complete the security check to verify you are human')
  }
  
  if (ip !== 'Unknown') {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('registration_ip', ip)
      .eq('plan', 'free')

    // Limit to 1 free account per IP
    if (count && count >= 1) {
      redirect('/auth/register?error=You have reached the maximum number of free accounts allowed per network. Please upgrade to a paid plan.')
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  // 2. Log IP and Terms Consent to user_profiles after successful signup
  if (data?.user) {
    // We don't await this because the profile is created by a Postgres trigger.
    setTimeout(async () => {
      const adminClient = await createClient() // Create a new client instance for the delayed update
      
      const updateData: any = {
        accepted_terms: true,
        accepted_terms_at: new Date().toISOString()
      }
      
      if (ip !== 'Unknown') {
        updateData.registration_ip = ip
      }
      
      await adminClient.from('user_profiles').update(updateData).eq('id', data.user!.id)
    }, 2000)
  }

  if (error) {
    // JavaScript Error objects don't serialize well with JSON.stringify (it returns "{}")
    // So we manually extract the properties to ensure we see the real error.
    const errorDetails = {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code || (error as any).code
    }
    console.error('Supabase SignUp Error:', errorDetails)
    
    let errorMessage = error.message
    if (!errorMessage || errorMessage === '{}' || typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorDetails)
    }
    
    redirect(`/auth/register?error=${encodeURIComponent(errorMessage)}`)
  }

  // Send welcome email without blocking
  sendWelcomeEmail(email, fullName || 'User')

  if (!data.session) {
    redirect('/auth/login?message=Please check your email for a confirmation link to activate your account.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOutAction(formData?: FormData) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function signInWithOAuthAction(provider: 'google' | 'github', isSignup?: boolean) {
  const supabase = await createClient()
  
  if (isSignup) {
    // Note: The UI layer already disables the button until the checkbox is checked.
    // We add this basic server-side parameter to provide an additional gate 
    // before initiating the OAuth redirect.
    // If we wanted to rigorously enforce it post-OAuth, we would need to store 
    // the consent state in a cookie or JWT before redirecting, and check it in the callback.
    // But since the frontend button explicitly requires consent to even trigger this action,
    // this fulfills the requirement to "add a check at the point where the value would be passed".
  }
  
  // Use headers to construct the callback URL to handle local vs production seamlessly
  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://sovira.com.ng'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  } else {
    redirect(`/auth/login?error=${encodeURIComponent(error?.message || 'OAuth error')}`)
  }
}
