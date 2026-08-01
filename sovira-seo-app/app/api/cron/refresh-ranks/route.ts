import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkKeywordRank } from '@/lib/rank-tracker/serper'

export const maxDuration = 300 // Max duration for Vercel Cron

export async function GET(req: Request) {
  // Only allow Vercel Cron or specific auth headers if we want to protect it
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron attempt')
    // Continue anyway for local testing, but usually you'd block this in production.
  }

  const supabase = await createClient()

  try {
    // 1. Fetch all active keywords across all users
    const { data: keywords, error } = await supabase
      .from('tracked_keywords')
      .select('id, keyword, project_domain, country_code')
      .eq('is_active', true)

    if (error) throw error
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ success: true, message: 'No active keywords to track' })
    }

    let processedCount = 0
    let failedCount = 0

    // 2. Batch process with delay to respect rate limits
    for (const kw of keywords) {
      if (!kw.project_domain) continue

      try {
        const result = await checkKeywordRank(kw.keyword, kw.project_domain, kw.country_code || 'us')

        if (result.position !== undefined) { // Position can be null, but not undefined
          await supabase.from('rank_history').insert([{
            keyword_id: kw.id,
            position: result.position,
            checked_at: result.checkedAt,
            serp_features: result.serpFeatures
          }])
          processedCount++
        }
      } catch (err) {
        console.error(`Error processing keyword ${kw.id}:`, err)
        failedCount++
      }

      // Delay of 200ms between requests to avoid slamming Serper
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount,
      failed: failedCount
    })
  } catch (error: any) {
    console.error('Cron Refresh Ranks Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
