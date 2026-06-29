'use server'

import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'
import { ApifyClient } from 'apify-client'

export interface KeywordResult {
  id?: number
  keyword: string
  volume: string
  difficulty: number
  cpc: string
  trend: 'up' | 'down'
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational'
}

export async function getTrackedKeywords() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('tracked_keywords')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching keywords:', error)
    return { data: [], error: error.message }
  }

  // Add deterministic mocked ranking data
  const enrichedData = data?.map(k => {
    const pseudoRank = (k.keyword.length * 7 + 3) % 98 + 1
    const pseudoChange = (k.keyword.length % 5) === 0 ? 0 : (k.keyword.length % 2 === 0 ? 2 : -3)
    return { ...k, rank: pseudoRank, change: pseudoChange }
  }) || []

  return { data: enrichedData, error: null }
}

export async function trackKeyword(keywordData: Omit<KeywordResult, 'id'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tracked_keywords')
    .insert([
      {
        user_id: user.id,
        keyword: keywordData.keyword,
        volume: keywordData.volume,
        difficulty: keywordData.difficulty,
        cpc: keywordData.cpc,
        trend: keywordData.trend,
        intent: keywordData.intent,
      }
    ])

  if (error) {
    console.error('Error tracking keyword:', error)
    return { error: error.message }
  }

  // Log the activity
  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action: 'Tracked Keyword',
    details: { keyword: keywordData.keyword, difficulty: keywordData.difficulty }
  }])

  revalidatePath('/keywords')
  revalidatePath('/admin/activity')
  revalidatePath('/rank-tracker')
  return { success: true }
}

export async function untrackKeyword(keyword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tracked_keywords')
    .delete()
    .eq('user_id', user.id)
    .eq('keyword', keyword)

  if (error) {
    console.error('Error untracking keyword:', error)
    return { error: error.message }
  }

  revalidatePath('/keywords')
  revalidatePath('/rank-tracker')
  return { success: true }
}

export async function generateKeywordIdeasAction(seed: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { limitReached } = await checkUsageLimit(user.id, 'keyword')
    if (limitReached) {
      return { error: 'LIMIT_REACHED', message: 'You have reached your Free plan keyword research limit.' }
    }
  }

  const s = seed.trim()
  
  if (!process.env.APIFY_API_TOKEN) {
    return { error: 'Apify API token is missing' }
  }

  try {
    const apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN
    })

    // Using a common community SEO/Keyword scraper actor. 
    // You can override this ID in .env.local via APIFY_ACTOR_ID if you prefer another actor.
    const actorId = process.env.APIFY_ACTOR_ID || 'apify/google-search-scraper'
    
    // For a generic Google Search scraper, we extract related queries
    const run = await apifyClient.actor(actorId).call({
      queries: `${s} keyword research`,
      resultsPerPage: 10,
      countryCode: "us",
      languageCode: "en"
    })

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    
    // Parse the actor's output. Apify actors return varying schema depending on the exact actor.
    // We will attempt to map typical Google Search related queries or direct keyword data to our UI.
    let results: KeywordResult[] = []

    if (items && items.length > 0) {
      const firstResult: any = items[0]
      const related = firstResult.relatedQueries || []
      const peopleAlsoAsk = firstResult.peopleAlsoAsk || []
      
      // Merge related queries
      const rawKeywords = [...related.map((r: any) => r.title), ...peopleAlsoAsk.map((p: any) => p.question), s, `${s} guide`, `best ${s}`].filter(Boolean)
      const uniqueKeywords = Array.from(new Set(rawKeywords)).slice(0, 15)

      // Since apify/google-search-scraper doesn't return volume natively, 
      // if you switch to a dedicated Keyword tool actor (like 'seo-tools/keyword-research'), 
      // replace this mock mapping with direct access to item.volume, item.cpc, etc.
      results = uniqueKeywords.map((kw: string, i: number) => {
        // Fallback pseudorandom mapping to provide UI placeholders if the actor doesn't supply volume metrics
        const vol = Math.floor(Math.random() * 50000) + 1000
        const kd = Math.floor(Math.random() * 100)
        let kdLabel: 'Easy' | 'Medium' | 'Hard' = 'Medium'
        if (kd < 40) kdLabel = 'Easy'
        else if (kd > 70) kdLabel = 'Hard'

        const intents: ('Informational' | 'Transactional' | 'Commercial' | 'Navigational')[] = [
          'Informational', 'Transactional', 'Commercial', 'Navigational'
        ]

        return {
          keyword: String(kw),
          volume: vol,
          difficulty: kd,
          difficultyLabel: kdLabel,
          cpc: Number((Math.random() * 15 + 0.5).toFixed(2)),
          intent: intents[Math.floor(Math.random() * 4)],
        }
      })
    } else {
      return { error: 'No data returned from Apify' }
    }

    if (user) {
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Keyword Research',
        details: { query: seed, resultsCount: results.length, provider: 'apify' }
      }])
    }

    return { data: results }
  } catch (error: any) {
    console.error('Apify Error:', error)
    return { error: error.message || 'Failed to fetch keyword data from Apify' }
  }
}
