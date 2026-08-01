import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTrialExpiredEmail } from '@/lib/email'

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

    // 3. Find users whose trial expired exactly today
    // We look for users on the 'free' plan created 90 days ago.
    const ninetyDaysAgoStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ninetyDaysAgoStart.setHours(0, 0, 0, 0)
    
    const ninetyDaysAgoEnd = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ninetyDaysAgoEnd.setHours(23, 59, 59, 999)

    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, plan')
      .eq('plan', 'free')

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Since user creation date is in the auth.users table, we need to join or fetch individually.
    // An alternative is just to get all free users and filter by auth creation date.
    let emailsSent = 0;

    for (const profile of profiles) {
      const { data: userResponse, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      
      if (userError || !userResponse?.user) continue;

      const user = userResponse.user;
      const createdDate = new Date(user.created_at)

      // If created date is within the "exactly 90 days ago" window
      if (createdDate >= ninetyDaysAgoStart && createdDate <= ninetyDaysAgoEnd) {
        // Send email
        await sendTrialExpiredEmail(
          user.email || '', 
          profile.full_name || 'Creator'
        )
        emailsSent++;
      }
    }

    return NextResponse.json({ success: true, emailsSent })

  } catch (error: any) {
    console.error('Cron Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
