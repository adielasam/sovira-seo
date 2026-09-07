import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
    const plan = profile?.plan || 'free'
    if (!['pro', 'agency'].includes(plan)) {
      return NextResponse.json({ error: 'Requires Pro plan' }, { status: 403 })
    }

    const body = await req.json()
    let { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    if (!url.startsWith('http')) {
      url = 'https://' + url
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.statusText}`)
    }

    const html = await res.text()
    
    // Parse with cheerio to inject base tag and make links absolute
    const $ = cheerio.load(html)
    
    // Check if base tag exists
    if ($('base').length === 0) {
      const parsedUrl = new URL(url)
      const baseHref = parsedUrl.origin + parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)
      const baseTag = `<base href="${baseHref}">`
      
      if ($('head').length > 0) {
        $('head').prepend(baseTag)
      } else {
        $('html').prepend(`<head>\n  ${baseTag}\n</head>`)
      }
    }

    // Convert relative CSS/JS/Images to absolute
    $('img, script, link, a').each((_, el) => {
      const src = $(el).attr('src')
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try { $(el).attr('src', new URL(src, url).href) } catch (e) {}
      }
      
      const href = $(el).attr('href')
      if (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('#')) {
        try { $(el).attr('href', new URL(href, url).href) } catch (e) {}
      }
    })

    const finalHtml = $.html()

    return NextResponse.json({ html: finalHtml })
  } catch (error: any) {
    console.error('Clone URL error:', error)
    return NextResponse.json({ error: error.message || 'Failed to clone URL' }, { status: 500 })
  }
}
