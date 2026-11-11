import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

export const maxDuration = 60

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email')
  }

  const isAdiela = user.email?.toLowerCase().includes('adielasam2015')

  // Auto-heal owner account: permanently enforce agency plan
  if (isAdiela) {
    try {
      const adminClient = createAdminClient()
      const { data: prof } = await adminClient.from('user_profiles').select('plan').eq('id', user.id).single()
      if (prof?.plan !== 'agency') {
        await adminClient.from('user_profiles').update({ plan: 'agency' }).eq('id', user.id)
        await adminClient.from('subscriptions').upsert({
          user_id: user.id,
          plan_name: 'agency',
          paystack_reference: 'forever_free_admin',
          status: 'active',
          expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'user_id' })
      }
    } catch (e) {
      console.error('Owner plan auto-heal error:', e)
    }
  }

  // FORCE ADMIN REDIRECT (only for dedicated admin accounts, not adielasam)
  const { data: profile } = await supabase.from('user_profiles').select('role, plan').eq('id', user.id).single()
  if ((profile?.role === 'admin' || user.email === 'microsoftportharcourt@gmail.com') && !isAdiela) {
    redirect('/admin')
  }

  // 3-Month Free Trial Expiration Check (never applies to adielasam)
  const plan = profile?.plan || 'free'
  
  if (plan === 'free' && !isAdiela) {
    const signupDate = new Date(user.created_at).getTime()
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
    if (Date.now() - signupDate > ninetyDaysMs) {
      redirect('/pricing?expired=true')
    }
  }

  return (
    <div className="h-full bg-slate-50 dark:bg-[#0F172A] min-h-screen text-slate-900 dark:text-white transition-colors duration-200 pb-16 lg:pb-0">
      <div className="hidden lg:block">
        <Sidebar userEmail={user.email} />
      </div>
      <div className="pl-0 lg:pl-[var(--sidebar-width)] flex flex-col min-h-screen transition-[padding] duration-200 ease-in-out">
        <Topbar userEmail={user.email} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="relative z-10 h-full max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <UpgradeModal />
    </div>
  )
}
