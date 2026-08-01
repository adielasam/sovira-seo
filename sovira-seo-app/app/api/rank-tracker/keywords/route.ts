import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active keywords
    const { data: keywords, error: kwError } = await supabase
      .from('tracked_keywords')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('added_at', { ascending: false })

    if (kwError) throw new Error(kwError.message)

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Fetch rank history for these keywords (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const keywordIds = keywords.map(k => k.id)
    
    const { data: historyData, error: historyError } = await supabase
      .from('rank_history')
      .select('*')
      .in('keyword_id', keywordIds)
      .gte('checked_at', thirtyDaysAgo.toISOString())
      .order('checked_at', { ascending: false })

    if (historyError) throw new Error(historyError.message)

    // Assemble data
    const enrichedKeywords = keywords.map(kw => {
      const kwHistory = historyData?.filter(h => h.keyword_id === kw.id) || []
      
      let currentRank = null
      let change = 0
      
      if (kwHistory.length > 0) {
        currentRank = kwHistory[0].position
        if (kwHistory.length > 1) {
          // If previous rank was 10, and new is 5, change is +5
          // If previous rank was null, we don't calculate change
          const prev = kwHistory[1].position
          if (prev !== null && currentRank !== null) {
            change = prev - currentRank
          }
        }
      }

      return {
        ...kw,
        currentRank,
        change,
        history: kwHistory.map(h => ({ date: h.checked_at, rank: h.position }))
      }
    })

    return NextResponse.json({ data: enrichedKeywords })
  } catch (error: any) {
    console.error('Fetch Keywords Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch keywords' }, { status: 500 })
  }
}
