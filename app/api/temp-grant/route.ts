import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // 1. Update all matching adielasam profiles directly in user_profiles
    const { data: updatedProfiles, error: updErr } = await supabase
      .from('user_profiles')
      .update({ plan: 'agency' })
      .ilike('email', '%adielasam2015%')
      .select('id, email, plan')

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // 2. Also ensure 100-year subscription in subscriptions table
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    const results = []

    for (const profile of (updatedProfiles || [])) {
      const { error: subErr } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: profile.id,
          plan_name: 'agency',
          paystack_reference: 'forever_free_admin',
          status: 'active',
          expires_at: expiresAt
        }, { onConflict: 'user_id' })

      results.push({ 
        id: profile.id, 
        email: profile.email, 
        plan: 'agency', 
        subscription_saved: !subErr,
        subError: subErr?.message || null 
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Permanently granted 100-year Agency plan to adielasam accounts',
      profiles: results,
      expires_at: expiresAt
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
