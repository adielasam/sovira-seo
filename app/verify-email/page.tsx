import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VerifyEmailClient } from './verify-email-client'

export default async function VerifyEmailPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (user.email_confirmed_at) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4">
      <VerifyEmailClient email={user.email || ''} />
    </div>
  )
}
