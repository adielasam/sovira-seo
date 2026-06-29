'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkUsageLimit } from '@/lib/usage'

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

  const s = seed.trim().toLowerCase()
  const prefixes = [
    `best ${s}`,
    `how to ${s}`,
    `${s} for beginners`,
    `${s} tips`,
    `${s} guide`,
    `${s} online`,
    `${s} free`,
    `${s} fast`,
    `top ${s} strategies`,
    `${s} tutorial`,
    `${s} ideas`,
    `${s} tools`,
    `${s} course`,
    `${s} without experience`,
    `${s} from home`,
  ]
  const intents: KeywordResult['intent'][] = ['Informational', 'Commercial', 'Transactional', 'Navigational']

  // Deterministic seed-based generation
  const seededRand = (n: number, offset: number) => {
    let val = Math.abs(Math.sin(n * 9301 + offset * 49297 + seed.length * 233) * 233280)
    return val - Math.floor(val)
  }

  const results: KeywordResult[] = prefixes.map((kw, i) => {
    const r = seededRand(i, kw.length)
    const volume = Math.floor(r * 280000 + 1200)
    const diff = Math.floor(seededRand(i, i * 3) * 88 + 12)
    const cpc = (seededRand(i, i * 7) * 28 + 0.5).toFixed(2)
    return {
      id: i + 1,
      keyword: kw,
      volume: volume >= 1000 ? `${(volume / 1000).toFixed(0)}K` : String(volume),
      difficulty: diff,
      cpc: `$${cpc}`,
      trend: seededRand(i, i * 11) > 0.38 ? 'up' : 'down',
      intent: intents[Math.floor(seededRand(i, i * 5) * 4)],
    }
  })

  if (user) {
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Keyword Research',
      details: { query: seed, resultsCount: results.length }
    }])
  }

  return { data: results }
}
