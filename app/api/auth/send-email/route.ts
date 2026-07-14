import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/email/resend'

export async function POST(req: Request) {
  try {
    // Basic security check (in production, you should verify a webhook secret from Supabase)
    // Check for secret in header OR query parameter since Supabase UI changed
    const authHeader = req.headers.get('authorization')
    const url = new URL(req.url)
    const querySecret = url.searchParams.get('secret')
    
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET || 'sovira-webhook-secret'
    
    if (authHeader !== `Bearer ${expectedSecret}` && querySecret !== expectedSecret) {
      return NextResponse.json({ error: { http_code: 403, message: 'Unauthorized webhook secret' } }, { status: 403 })
    }

    const payload = await req.json()
    const { user, email_data } = payload

    if (!user || !user.email || !email_data) {
      return NextResponse.json({ error: { http_code: 400, message: 'Invalid payload from Supabase' } }, { status: 400 })
    }

    const type = email_data.email_action_type
    const tokenHash = email_data.token_hash
    const redirectTo = email_data.redirect_to || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    
    // For signup and magiclink
    if (type === 'signup' || type === 'magiclink') {
      const actionLink = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`
      const { data, error } = await sendVerificationEmail(user.email, actionLink)
      
      if (error) {
        console.error('Resend API Error:', error)
        // Return 403 instead of 500 so Supabase passes the message through instead of throwing AuthRetryableFetchError
        return NextResponse.json({ 
          error: { http_code: 403, message: `Resend Error: ${error.message}` } 
        }, { status: 403 })
      }
    }

    // Note: You can add logic for 'recovery' (password reset) here later

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in send-email webhook:', error)
    return NextResponse.json({ 
      error: { http_code: 500, message: `Webhook Exception: ${error.message}` } 
    }, { status: 500 })
  }
}
