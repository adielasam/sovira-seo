import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Define the main domains that should NOT be treated as subdomains
  const mainDomains = [
    'sovira.com.ng',
    'www.sovira.com.ng',
    'localhost:3000'
  ]

  const isVercelDomain = hostname.endsWith('.vercel.app')
  const isMainDomain = mainDomains.includes(hostname) || isVercelDomain

  // If it's a subdomain (e.g., dorvas.sovira.com.ng)
  if (!isMainDomain && hostname.endsWith('.sovira.com.ng')) {
    const subdomain = hostname.replace('.sovira.com.ng', '')
    
    // Rewrite the URL to point to our dynamic [slug] route
    // e.g., dorvas.sovira.com.ng/about -> www.sovira.com.ng/dorvas/about
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, request.url))
  }

  // Otherwise, run standard Supabase session update for the main dashboard/marketing site
  let response = await updateSession(request)

  // Check for affiliate referral code in URL
  const refCode = request.nextUrl.searchParams.get('ref')
  if (refCode) {
    response.cookies.set('sovira_ref', refCode, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
