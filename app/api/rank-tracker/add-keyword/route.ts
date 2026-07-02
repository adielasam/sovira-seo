import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkKeywordRank } from '@/lib/rank-tracker/serper'

export async function POST(req: Request) {
  try {
    const { keyword, targetUrl, projectDomain, searchVolume, countryCode } = await req.json()
    
    if (!keyword || !projectDomain) {
      return NextResponse.json({ error: 'Keyword and Project Domain are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check usage limit
    const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
    const plan = profile?.plan || 'free'
    
    const { count } = await supabase.from('tracked_keywords').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true)
    
    const limits: Record<string, number> = { free: 5, starter: 5, pro: 15, agency: 30 }
    const maxKeywords = limits[plan] || 5
    
    if (count !== null && count >= maxKeywords) {
       return NextResponse.json({ error: 'LIMIT_REACHED', message: `You have reached your limit of ${maxKeywords} tracked keywords on the ${plan} plan.` }, { status: 403 })
    }

    // 1. Insert Keyword
    const { data: insertedKeyword, error: insertError } = await supabase
      .from('tracked_keywords')
      .insert([{
        user_id: user.id,
        keyword,
        project_domain: projectDomain,
        target_url: targetUrl || '',
        search_volume: searchVolume || '0',
        country_code: countryCode || 'us',
        is_active: true
      }])
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    // 2. Perform initial Rank Check
    const result = await checkKeywordRank(keyword, projectDomain, countryCode || 'us')

    // 3. Insert into rank_history
    const { error: historyError } = await supabase
      .from('rank_history')
      .insert([{
        keyword_id: insertedKeyword.id,
        position: result.position,
        checked_at: result.checkedAt,
        serp_features: result.serpFeatures
      }])

    if (historyError) {
      console.error('Failed to log rank history:', historyError)
      // Continue anyway, we can re-check later
    }

    // Log Activity
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Added Tracked Keyword',
      details: { keyword, domain: projectDomain, initial_rank: result.position }
    }])

    return NextResponse.json({ success: true, data: insertedKeyword, initialRank: result.position })
  } catch (error: any) {
    console.error('Add Keyword Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to add keyword' }, { status: 500 })
  }
}
