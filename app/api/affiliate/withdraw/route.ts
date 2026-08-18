import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { amount, bank_name, account_number, account_name } = await req.json()
    
    if (!amount || amount < 5000) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is ₦5,000' }, { status: 400 })
    }
    if (!bank_name || !account_number || !account_name) {
      return NextResponse.json({ error: 'Bank details are incomplete' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {}
      }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check balance
    const { data: profile } = await supabase
      .from('affiliate_profiles')
      .select('balance_ngn')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.balance_ngn < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Insert withdrawal request
    const { error: withdrawError } = await supabase
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: user.id,
        amount,
        bank_name,
        account_number,
        account_name,
        status: 'pending'
      })

    if (withdrawError) throw withdrawError

    // Deduct balance
    const { error: updateError } = await supabase
      .from('affiliate_profiles')
      .update({
        balance_ngn: profile.balance_ngn - amount
      })
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted successfully' })
  } catch (error: any) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
