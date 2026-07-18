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
      console.error('Google Trends failed/blocked, using Reddit Fallback:', googleError)
      
      // Fallback: Real-time Viral Topics from Reddit API (No API key needed, never blocks Vercel)
      const redditRes = await fetch('https://www.reddit.com/r/popular.json?limit=15', {
        headers: { 'User-Agent': 'SoviraApp/1.0' } // Reddit requires a User-Agent
      })
      const redditData = await redditRes.json()
      
      if (redditData?.data?.children) {
        trendingList = redditData.data.children.map((post: any) => ({
          id: post.data.id,
          title: post.data.title,
          entityNames: [post.data.subreddit],
          articles: [{
            title: post.data.title,
            url: `https://reddit.com${post.data.permalink}`,
            source: post.data.subreddit_name_prefixed,
            time: new Date(post.data.created_utc * 1000).toISOString(),
            snippet: post.data.selftext?.substring(0, 150) || 'Viral topic trending across the internet right now.'
          }],
          image: post.data.thumbnail && post.data.thumbnail.startsWith('http') ? post.data.thumbnail : null,
          shareUrl: `https://reddit.com${post.data.permalink}`
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
