import { NextResponse } from 'next'
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

    const results = await googleTrends.realTimeTrends({
      geo: geo,
      category: 'all',
    })

    const parsedData = JSON.parse(results)
    
    if (!parsedData || !parsedData.storySummaries || !parsedData.storySummaries.trendingStories) {
      return NextResponse.json({ error: 'No trending data available for this region' }, { status: 404 })
    }

    // Format the data into a cleaner structure for the frontend
    const trendingList = parsedData.storySummaries.trendingStories.map((story: any) => ({
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

    return NextResponse.json({ trending: trendingList })

  } catch (error: any) {
    console.error('Trending API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch trends' }, { status: 500 })
  }
}
