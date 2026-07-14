'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { sendWelcomeEmail, sendLoginAlertEmail } from '@/lib/email'

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/auth/login?error=Email and password are required')
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

    // Get IP and User-Agent for the login alert email
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'Unknown'
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

  if (!email || !password) {
    redirect('/auth/register?error=Email and password are required')
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

export async function signInWithOAuthAction(provider: 'google' | 'github') {
  const supabase = await createClient()
  
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
