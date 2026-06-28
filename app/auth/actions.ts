'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
  
  if (data?.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
      
    if (profile?.role === 'admin' || data.user.email === 'microsoftportharcourt@gmail.com') {
      destination = '/admin'
    }
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
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`)
  }

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
