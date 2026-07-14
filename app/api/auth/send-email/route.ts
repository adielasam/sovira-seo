import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/email/resend'

export async function POST(req: Request) {
  try {
    // Basic security check (in production, you should verify a webhook secret from Supabase)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET || 'sovira-webhook-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json()
    const { user, email_data } = payload

    if (!user || !user.email || !email_data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Construct the verification link that points to Supabase's built-in verify endpoint
    // This ensures Supabase correctly verifies the token and redirects the user
    const type = email_data.email_action_type
    const tokenHash = email_data.token_hash
    const redirectTo = email_data.redirect_to || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    
    // For signup and magiclink
    if (type === 'signup' || type === 'magiclink') {
      const actionLink = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`
      await sendVerificationEmail(user.email, actionLink)
    }

    // Note: You can add logic for 'recovery' (password reset) here later

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in send-email webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
