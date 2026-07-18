import { NextResponse } from 'next/server'
import googleTrends from 'google-trends-api'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const geo = searchParams.get('geo') || 'US'
    const niche = searchParams.get('niche') || 'All Niches'

    let trendingList: any[] = []

    if (niche !== 'All Niches') {
      try {
        const { text } = await generateText({
          model: groq('llama3-8b-8192'),
          prompt: `Generate 6 current, highly viral and trending topics/keywords in the "${niche}" niche for the country code "${geo}".
          Return ONLY a raw JSON array of objects. Do not include any markdown formatting, backticks, or code blocks.
          Format strictly like this:
          [
            {
              "title": "Topic Keyword",
              "snippet": "A one sentence summary of why this is trending right now."
            }
          ]`,
          temperature: 0.8
        })

        const rawText = text.trim().replace(/```json/gi, '').replace(/```/g, '')
        const topics = JSON.parse(rawText)

        trendingList = topics.map((t: any, i: number) => ({
          id: `groq-${i}`,
          title: t.title,
          entityNames: [niche],
          articles: [{
            title: t.title,
            url: `https://news.google.com/search?q=${encodeURIComponent(t.title)}`,
            source: 'AI Trend Analysis',
            time: new Date().toISOString(),
            snippet: t.snippet
          }],
          image: null,
          shareUrl: `https://news.google.com/search?q=${encodeURIComponent(t.title)}`
        }))
        
        return NextResponse.json({ trending: trendingList })
      } catch (aiError) {
        console.error('Groq Trending error:', aiError)
        // Fallthrough to Hacker News if Groq fails
      }
    }

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
