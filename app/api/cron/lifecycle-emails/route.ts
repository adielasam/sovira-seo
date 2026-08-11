import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdvantagesEmail, sendTrialEndingWarning, sendTrialExpiredEmail } from '@/lib/mailer'

export const maxDuration = 60 // Max duration for Vercel Hobby

// This endpoint is triggered by Vercel Cron (via daily-runner)
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

    // 3. Helper to process a specific lifecycle tier
    const processTier = async (daysSinceSignup: number, emailType: 'features' | 'trial_warning' | 'trial_expired') => {
      // Calculate target date ranges
      const targetDateEnd = new Date(now.getTime() - daysSinceSignup * 24 * 60 * 60 * 1000)
      const targetDateStart = new Date(now.getTime() - (daysSinceSignup + 1) * 24 * 60 * 60 * 1000)

      // Only target free users
      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, plan, marketing_emails_opt_out, email, full_name')
        .eq('plan', 'free')
        .is('marketing_emails_opt_out', false)

      if (error || !profiles) {
        console.error(`Error fetching profiles for ${daysSinceSignup} days:`, error)
        return
      }

      let emailsSent = 0;

      for (const profile of profiles) {
        // Ensure we only process free tier emails
        if (profile.plan !== 'free') continue

        // Re-verify they haven't received this email type yet
        const { data: existingEmail } = await supabaseAdmin
          .from('emails_sent')
          .select('id')
          .eq('user_id', profile.id)
          .eq('email_type', emailType)
          .single()

        if (existingEmail) continue // Already sent

        // Fetch auth user to check created_at
        const { data: userResponse, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        if (userError || !userResponse?.user) continue

        const createdDate = new Date(userResponse.user.created_at)

        // If created date is within our target 24h window
        if (createdDate >= targetDateStart && createdDate <= targetDateEnd) {
          
          let result = { success: false }
          
          if (emailType === 'features') {
            result = await sendAdvantagesEmail(profile.email || '', profile.full_name || 'Creator')
          } else if (emailType === 'trial_warning') {
            result = await sendTrialEndingWarning(profile.email || '', profile.full_name || 'Creator')
          } else if (emailType === 'trial_expired') {
            result = await sendTrialExpiredEmail(profile.email || '', profile.full_name || 'Creator')
          }

          if (result.success) {
            emailsSent++;
            await supabaseAdmin.from('emails_sent').insert({
              user_id: profile.id,
              email_type: emailType
            })
          }
        }
      }
      return emailsSent
    }

    const [featuresSent, warningSent, expiredSent] = await Promise.all([
      processTier(3, 'features'),
      processTier(11, 'trial_warning'),
      processTier(14, 'trial_expired')
    ])

    return NextResponse.json({ 
      success: true, 
      message: `Lifecycle emails sent. Features: ${featuresSent}, Warnings: ${warningSent}, Expired: ${expiredSent}` 
    })

  } catch (error) {
    console.error('Lifecycle emails error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
