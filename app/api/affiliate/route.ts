import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
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

    // Check if profile exists
    let { data: profile } = await supabase
      .from('affiliate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Create profile if it doesn't exist
    if (!profile) {
      // Generate a short unique referral code
      const referralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const { data: newProfile, error: insertError } = await supabase
        .from('affiliate_profiles')
        .insert({
          user_id: user.id,
          referral_code: referralCode,
          balance_ngn: 0,
          total_earned_ngn: 0
        })
        .select()
        .single()
        
      if (insertError) throw insertError
      profile = newProfile
    }

    // Get counts
    const { count: referralsCount } = await supabase
      .from('affiliate_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referring_affiliate_id', user.id)

    // Get withdrawal history
    const { data: withdrawals } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      profile,
      referralsCount: referralsCount || 0,
      withdrawals: withdrawals || []
    })
  } catch (error: any) {
    console.error('Affiliate fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
