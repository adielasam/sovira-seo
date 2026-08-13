import { NextResponse } from 'next/server'

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

    // 1. Fetch reliable metadata via oEmbed
    let title = 'Unknown Title'
    let thumbnail = ''
    let channel = 'Unknown Channel'
    
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json()
        title = oembedData.title || title
        channel = oembedData.author_name || channel
        thumbnail = oembedData.thumbnail_url || thumbnail
      }
    } catch (e) {
      console.warn('oEmbed fetch failed', e)
    }

    // 2. Fetch HTML to scrape Date and Category
    let uploadDate = 'Unknown Date'
    let category = 'Unknown Category'

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      if (res.ok) {
        const html = await res.text()
        
        const dateMatch = html.match(/"publishDate":"([^"]+)"/) || html.match(/<meta itemprop="datePublished" content="([^"]+)">/)
        if (dateMatch && dateMatch[1]) {
           uploadDate = new Date(dateMatch[1]).toLocaleDateString()
        }

        const categoryMatch = html.match(/"category":"([^"]+)"/)
        if (categoryMatch && categoryMatch[1]) {
           category = categoryMatch[1]
        }
      }
    } catch (e) {
      console.warn('HTML scrape failed', e)
    }
    
    return NextResponse.json({
      title,
      thumbnail,
      channel,
      uploadDate,
      category
    })
    
  } catch (error: any) {
    console.error('YouTube Scrape Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch video metadata' }, { status: 500 })
  }
}
