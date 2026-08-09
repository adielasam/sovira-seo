import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const hostname = req.headers.get('host') || ''

  // Define the main domains that should NOT be treated as subdomains
  const mainDomains = [
    'sovira.com.ng',
    'www.sovira.com.ng',
    'localhost:3000'
  ]

  // Vercel preview URLs usually end with vercel.app, we can exclude them or handle them
  const isVercelDomain = hostname.endsWith('.vercel.app')
  const isMainDomain = mainDomains.includes(hostname) || isVercelDomain

  // If it's a subdomain (e.g., dorvas.sovira.com.ng)
  if (!isMainDomain && hostname.endsWith('.sovira.com.ng')) {
    const subdomain = hostname.replace('.sovira.com.ng', '')
    
    // Rewrite the URL to point to our dynamic [slug] route
    // e.g., dorvas.sovira.com.ng/about -> www.sovira.com.ng/dorvas/about
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url))
  }

  return NextResponse.next()
}
