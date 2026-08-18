import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Admin check helper
async function checkAdmin() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {}
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export async function GET() {
  try {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const supabaseAdmin = await createAdminClient()

    const { data: withdrawals, error } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .select('*, affiliate_profiles!inner(referral_code, user_profiles(full_name, email))')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ withdrawals })
  } catch (error: any) {
    console.error('Admin affiliates error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { id, action } = await req.json()
    if (!id || !['pay', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()
    
    // Get the withdrawal
    const { data: withdrawal } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .select('*')
      .eq('id', id)
      .single()

    if (!withdrawal || withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Withdrawal not found or already processed' }, { status: 400 })
    }

    const newStatus = action === 'pay' ? 'paid' : 'rejected'

    // If rejecting, refund the balance
    if (newStatus === 'rejected') {
      const { data: profile } = await supabaseAdmin
        .from('affiliate_profiles')
        .select('balance_ngn')
        .eq('user_id', withdrawal.affiliate_id)
        .single()

      if (profile) {
        await supabaseAdmin.from('affiliate_profiles').update({
          balance_ngn: Number(profile.balance_ngn) + Number(withdrawal.amount)
        }).eq('user_id', withdrawal.affiliate_id)
      }
    }

    // Update status
    const { error } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .update({
        status: newStatus,
        processed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: `Withdrawal marked as ${newStatus}` })
  } catch (error: any) {
    console.error('Admin withdrawal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
