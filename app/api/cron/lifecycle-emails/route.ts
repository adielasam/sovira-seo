import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReengagementEmail } from '@/lib/email'

// This endpoint is triggered by Vercel Cron
export async function GET(request: Request) {
  try {
    // 1. Verify cron secret if in production
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    // 2. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()

    // 3. Helper to process a specific inactivity tier
    const processTier = async (daysInactive: number, emailType: string) => {
      // Calculate target date ranges (e.g. for 5 days ago, we want between 5 and 6 days ago)
      const targetDateEnd = new Date(now.getTime() - daysInactive * 24 * 60 * 60 * 1000)
      const targetDateStart = new Date(now.getTime() - (daysInactive + 1) * 24 * 60 * 60 * 1000)

      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, last_active_at, marketing_emails_opt_out')
        .lte('last_active_at', targetDateEnd.toISOString())
        .gt('last_active_at', targetDateStart.toISOString())
        .is('marketing_emails_opt_out', false) // assuming default false

      if (error || !profiles) {
        console.error(`Error fetching profiles for ${daysInactive} days:`, error)
        return
      }

      for (const profile of profiles) {
        // Double check they haven't opted out (if null or false)
        if (profile.marketing_emails_opt_out) continue

        // Re-verify they haven't received this email type yet
        const { data: existingEmail } = await supabaseAdmin
          .from('emails_sent')
          .select('id')
          .eq('user_id', profile.id)
          .eq('email_type', emailType)
          .single()

        if (existingEmail) continue // Already sent

        // 4. Fetch the actual user email from auth schema using admin api
        const { data: userResponse, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        if (userError || !userResponse?.user?.email) continue

        // Critical Check: Verify last_active_at again right before sending
        // In this case, we just fetched it so it's fresh, but if there was a delay, we could query again.
        const { data: freshProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('last_active_at')
          .eq('id', profile.id)
          .single()
          
        if (freshProfile && new Date(freshProfile.last_active_at).getTime() > targetDateEnd.getTime()) {
          console.log(`User ${profile.id} reactivated recently, skipping ${emailType}`)
          continue
        }

        // Send email
        const emailResult = await sendReengagementEmail(userResponse.user.email, daysInactive, profile.id)

        if (emailResult.success) {
          // Log it
          await supabaseAdmin.from('emails_sent').insert([{
            user_id: profile.id,
            email_type: emailType
          }])
        }
      }
    }

    // Process all tiers
    await Promise.all([
      processTier(5, 'reengagement_5day'),
      processTier(14, 'reengagement_14day'),
      processTier(30, 'reengagement_30day')
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lifecycle emails cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
