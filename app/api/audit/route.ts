import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { allowed, limitReached } = await checkUsageLimit(user.id, 'audit')
      if (limitReached) {
        return NextResponse.json({ error: 'LIMIT_REACHED', message: 'You have reached your Free plan audit limit.' }, { status: 403 })
      }
    }

    // Call Google PageSpeed API
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=SEO&category=PERFORMANCE`
    )
    
    if (!response.ok) {
      throw new Error(`Google API returned ${response.status}`)
    }

    const data = await response.json()
    
    // Extract scores
    const lighthouse = data.lighthouseResult
    if (!lighthouse) {
      throw new Error('No lighthouse result found in response')
    }

    const seoScore = Math.round((lighthouse.categories?.seo?.score || 0) * 100)
    const performanceScore = Math.round((lighthouse.categories?.performance?.score || 0) * 100)
    
    const overallScore = Math.round((seoScore + performanceScore) / 2)
    
    const speedMs = lighthouse.audits?.['speed-index']?.numericValue || 0
    const speed = speedMs < 1000 ? `${Math.round(speedMs)}ms` : `${(speedMs / 1000).toFixed(2)}s`

    // Extract some issues (audits with score < 1)
    const issues = []
    const audits = lighthouse.audits || {}
    
    for (const [key, audit] of Object.entries<any>(audits)) {
      if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'manual' && audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'informative') {
        let type = 'warning'
        if (audit.score < 0.5) type = 'critical'
        
        issues.push({
          type,
          title: audit.title,
          description: audit.description.split('.')[0] + '.', // Shorten description
        })
      }
    }
    
    // Limit to top 10 issues
    const topIssues = issues.sort((a, b) => (a.type === 'critical' ? -1 : 1)).slice(0, 10)

    // Ensure we have some success ones if possible, or just return as is
    
    if (user) {
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Audit Run',
        details: { url, overallScore }
      }])
    }

    return NextResponse.json({
      overallScore,
      seoScore,
      performanceScore,
      speed,
      issues: topIssues
    })
  } catch (error: any) {
    console.error('Audit Error:', error)
    return NextResponse.json({ error: 'Failed to run audit. Ensure URL is publicly accessible.' }, { status: 500 })
  }
}
