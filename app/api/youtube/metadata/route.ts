import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Basic validation
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch page: ${res.statusText}`)
    }
    
    const html = await res.text()
    const $ = cheerio.load(html)
    
    const title = $('meta[property="og:title"]').attr('content') || $('title').text()
    const thumbnail = $('meta[property="og:image"]').attr('content') || ''
    
    // Channel name is usually in <link itemprop="name" content="..."> inside a span itemprop="author"
    let channel = $('span[itemprop="author"] link[itemprop="name"]').attr('content')
    if (!channel) {
       // fallback: parse from JSON block
       const scriptMatch = html.match(/"ownerChannelName":"([^"]+)"/)
       if (scriptMatch && scriptMatch[1]) {
           channel = scriptMatch[1]
       }
    }
    
    let uploadDate = $('meta[itemprop="uploadDate"]').attr('content') || $('meta[itemprop="datePublished"]').attr('content')
    if (!uploadDate) {
       const dateMatch = html.match(/"publishDate":"([^"]+)"/)
       if (dateMatch && dateMatch[1]) {
           uploadDate = dateMatch[1]
       }
    }
    
    return NextResponse.json({
      title: title || 'Unknown Title',
      thumbnail,
      channel: channel || 'Unknown Channel',
      uploadDate: uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Unknown Date',
    })
    
  } catch (error: any) {
    console.error('YouTube Scrape Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch video metadata' }, { status: 500 })
  }
}
