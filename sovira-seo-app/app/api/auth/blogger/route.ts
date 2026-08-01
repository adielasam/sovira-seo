import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID in environment variables' }, { status: 500 })
  }

  const url = new URL(request.url)
  const redirectUri = `${url.origin}/api/auth/blogger/callback`

  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  oauthUrl.searchParams.set('client_id', clientId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/blogger')
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')
  // Pass the user ID in the state so we know who is connecting
  oauthUrl.searchParams.set('state', user.id)

  return NextResponse.redirect(oauthUrl.toString())
}
