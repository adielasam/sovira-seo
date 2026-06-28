'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  return { data, error: null }
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
