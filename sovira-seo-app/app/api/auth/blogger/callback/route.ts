import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const userId = url.searchParams.get('state') // We passed user.id in the state parameter
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/integrations?error=missing_code_or_state', request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/integrations?error=missing_google_credentials', request.url))
  }

  const redirectUri = `${url.origin}/api/auth/blogger/callback`

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('Failed to exchange code:', errText)
      return NextResponse.redirect(new URL('/integrations?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token } = tokens

    // Fetch the user's blogs to get their Blog ID
    let blogId = null;
    try {
      const blogResponse = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      if (blogResponse.ok) {
        const blogData = await blogResponse.json()
        if (blogData.items && blogData.items.length > 0) {
          blogId = blogData.items[0].id
        }
      } else {
        console.error('Failed to fetch blogs:', await blogResponse.text())
      }
    } catch (e) {
      console.error('Error fetching blogs:', e)
    }

    const supabase = createAdminClient()

    const updateData: any = {
      cms_provider: 'blogger',
      blogger_access_token: access_token,
      cms_connected_at: new Date().toISOString()
    }

    if (blogId) {
      updateData.blogger_blog_id = blogId
    }

    // Only update refresh token if we got one (Google only sends it on the very first authorization)
    if (refresh_token) {
      updateData.blogger_refresh_token = refresh_token
    }

    const { error: dbError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)

    if (dbError) {
      console.error('Failed to save Blogger tokens:', dbError)
      return NextResponse.redirect(new URL('/integrations?error=database_error', request.url))
    }

    // Log the action
    await supabase.from('activity_logs').insert([{
      user_id: userId,
      action: 'CMS Connected',
      details: { provider: 'blogger' }
    }])

    return NextResponse.redirect(new URL('/integrations?success=blogger_connected', request.url))
  } catch (err) {
    console.error('Error in Blogger callback:', err)
    return NextResponse.redirect(new URL('/integrations?error=internal_server_error', request.url))
  }
}
