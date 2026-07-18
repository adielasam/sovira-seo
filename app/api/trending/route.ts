import { NextResponse } from 'next/server'
import googleTrends from 'google-trends-api'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const geo = searchParams.get('geo') || 'US'

    let trendingList: any[] = []

    try {
      const results = await googleTrends.realTimeTrends({
        geo: geo,
        category: 'all',
      })
      const parsedData = JSON.parse(results)
      
      if (parsedData && parsedData.storySummaries && parsedData.storySummaries.trendingStories) {
        trendingList = parsedData.storySummaries.trendingStories.map((story: any) => ({
          id: story.id,
          title: story.title,
          entityNames: story.entityNames,
          articles: story.articles.map((article: any) => ({
            title: article.articleTitle,
            url: article.url,
            source: article.source,
            time: article.time,
            snippet: article.snippet
          })),
          image: story.image ? story.image.imgUrl : null,
          shareUrl: story.shareUrl
        }))
      } else {
        throw new Error('Google Trends data malformed')
      }
    } catch (googleError) {
      console.error('Google Trends failed/blocked, using HN Fallback:', googleError)
      
      // Fallback: Real-time Viral Topics from Hacker News API (100% Free, NEVER blocks Vercel)
      const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
      const hnIds = await hnRes.json()
      
      if (Array.isArray(hnIds)) {
        const top15 = hnIds.slice(0, 15)
        
        // Fetch details for top 15 stories in parallel
        const storyPromises = top15.map(id => 
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json())
        )
        const stories = await Promise.all(storyPromises)
        
        trendingList = stories.filter(s => s && s.title).map((story: any) => ({
          id: String(story.id),
          title: story.title,
          entityNames: ['Tech & Business'],
          articles: [{
            title: story.title,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            source: 'Hacker News',
            time: new Date(story.time * 1000).toISOString(),
            snippet: 'Currently trending viral topic on the front page of Hacker News.'
          }],
          image: null,
          shareUrl: story.url || `https://news.ycombinator.com/item?id=${story.id}`
        }))
      } else {
        throw new Error('All trending sources failed')
      }
    }

    return NextResponse.json({ trending: trendingList })

  } catch (error: any) {
    console.error('Trending API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch trends' }, { status: 500 })
  }
}
