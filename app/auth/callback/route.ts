import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      // Check if this is a relatively new user (within last 5 minutes)
      const userAgeMs = Date.now() - new Date(session.user.created_at).getTime()
      if (userAgeMs < 5 * 60 * 1000) {
        // Send welcome email without blocking
        sendWelcomeEmail(session.user.email || '', session.user.user_metadata?.full_name || 'User', session.user.id)
          .catch(err => console.error('Error sending welcome email in callback:', err))
      }
      
      // successful login, redirect to next or dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not verify your email address. The link may be expired.`)
}
