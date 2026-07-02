import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkKeywordRank } from '@/lib/rank-tracker/serper'

export async function POST(req: Request) {
  try {
    const { keywordId } = await req.json()
    
    if (!keywordId) {
      return NextResponse.json({ error: 'Keyword ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch keyword details
    const { data: keyword, error: keywordError } = await supabase
      .from('tracked_keywords')
      .select('*')
      .eq('id', keywordId)
      .eq('user_id', user.id)
      .single()

    if (keywordError || !keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    // 2. Perform Rank Check
    const result = await checkKeywordRank(keyword.keyword, keyword.project_domain || '', keyword.country_code || 'us')

    // 3. Fetch previous rank for delta
    const { data: history } = await supabase
      .from('rank_history')
      .select('position')
      .eq('keyword_id', keywordId)
      .order('checked_at', { ascending: false })
      .limit(1)

    const previousRank = history && history.length > 0 ? history[0].position : null

    // 4. Insert new rank history
    const { error: historyError } = await supabase
      .from('rank_history')
      .insert([{
        keyword_id: keywordId,
        position: result.position,
        checked_at: result.checkedAt,
        serp_features: result.serpFeatures
      }])

    if (historyError) throw new Error(historyError.message)

    return NextResponse.json({ 
      success: true, 
      newRank: result.position,
      previousRank,
      delta: previousRank && result.position ? previousRank - result.position : 0
    })
  } catch (error: any) {
    console.error('Check Keyword Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to check keyword' }, { status: 500 })
  }
}
