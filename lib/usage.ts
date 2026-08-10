import { createClient } from './supabase/server'

export type UsageActionType = 'audit' | 'keyword' | 'words' | 'image' | 'video' | 'insight' | 'slides' | 'instantsite' | 'seo'

export async function checkUsageLimit(userId: string, actionType: UsageActionType): Promise<{ allowed: boolean, limitReached: boolean, maxLimit: number, trialExpired?: boolean }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user && (user.email === 'adielasam2015@gmail.com' || user.email === 'adielasam20153@gmail.com')) {
    return { allowed: true, limitReached: false, maxLimit: Infinity }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single()
    
  let plan = profile?.plan || 'free'
  if (plan === 'free trial') plan = 'free'

  // If user is on the free plan, we must enforce the 14-day trial rule.
  if (plan === 'free' && user) {
    const createdDate = new Date(user.created_at)
    const now = new Date()
    const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    if (ageInDays > 14) {
      return { allowed: false, limitReached: true, maxLimit: 0, trialExpired: true }
    }
  }

  // Define limits for all plans
  // Free plan uses DAILY limits. Paid plans use 30-day limits.
  const limits: Record<string, Record<string, number>> = {
    free: { keyword: 10, audit: 5, words: 1000, image: 0, video: 0, insight: 0, slides: 2, instantsite: 3, seo: 5 },
    starter: { keyword: 50, audit: 50, words: 10000, image: 15, video: 1, insight: 0, slides: 15, instantsite: 15, seo: 50 },
    pro: { keyword: 500, audit: Infinity, words: 100000, image: 100, video: 3, insight: Infinity, slides: 100, instantsite: 100, seo: 500 },
    agency: { keyword: 5000, audit: Infinity, words: Infinity, image: 500, video: 15, insight: Infinity, slides: 500, instantsite: Infinity, seo: Infinity },
  }

  const userLimits = limits[plan] || limits['free']
  const maxLimit = userLimits[actionType]

  if (maxLimit === 0) {
    return { allowed: false, limitReached: true, maxLimit }
  }
  if (maxLimit === Infinity) {
    return { allowed: true, limitReached: false, maxLimit }
  }
  
  // Count usage in the current billing cycle (Free = 1 day, Paid = 30 days)
  const windowStart = new Date()
  if (plan === 'free') {
    windowStart.setDate(windowStart.getDate() - 1)
  } else {
    windowStart.setDate(windowStart.getDate() - 30)
  }

  // Track keywords using actual tracked_keywords table instead of logs if actionType is 'keyword'
  if (actionType === 'keyword') {
    const { count } = await supabase
      .from('tracked_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      
    if (count !== null && count >= maxLimit) {
      return { allowed: false, limitReached: true, maxLimit }
    }
    return { allowed: true, limitReached: false, maxLimit }
  }

  // Calculate words usage using details->>words
  if (actionType === 'words') {
    const { data } = await supabase
      .from('activity_logs')
      .select('details')
      .eq('user_id', userId)
      .eq('action', 'SEO Content Generated')
      .gte('created_at', windowStart.toISOString())

    let totalWords = 0
    data?.forEach(log => {
      const words = log.details?.words || 0
      totalWords += Number(words)
    })

    if (totalWords >= maxLimit) {
      return { allowed: false, limitReached: true, maxLimit }
    }
    return { allowed: true, limitReached: false, maxLimit }
  }
  
  let actionMatch = ''
  if (actionType === 'audit') actionMatch = 'Audit Run'
  if (actionType === 'insight') actionMatch = 'Generated Rank Insight'
  if (actionType === 'image') actionMatch = 'Image Generated'
  if (actionType === 'video') actionMatch = 'Video Generated'
  if (actionType === 'slides') actionMatch = 'Slide Generated'
  if (actionType === 'instantsite') actionMatch = 'InstantSite Generated'
  if (actionType === 'seo') actionMatch = 'SEO Content Generated'
  
  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', actionMatch)
    .gte('created_at', windowStart.toISOString())
    
  if (count !== null && count >= maxLimit) {
    return { allowed: false, limitReached: true, maxLimit }
  }
  
  return { allowed: true, limitReached: false, maxLimit }
}

export async function checkAndIncrementDashboardUsage(userId: string): Promise<{ allowed: boolean, remaining: number, resetsAt?: string }> {
  const supabase = await createClient()

  // Admin bypass
  const { data: { user } } = await supabase.auth.getUser()
  if (user && (user.email === 'adielasam2015@gmail.com' || user.email === 'adielasam20153@gmail.com')) {
    return { allowed: true, remaining: 9999 }
  }

  // 1. Fetch user's row
  const { data: usage, error } = await supabase
    .from('dashboard_usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  const now = new Date()

  // If no row exists, create one and initialize with 1 usage
  if (error && error.code === 'PGRST116') {
    await supabase.from('dashboard_usage').insert({
      user_id: userId,
      generation_count: 1,
      period_start: now.toISOString(),
      last_generated_at: now.toISOString()
    })
    return { allowed: true, remaining: 9 }
  }

  if (usage) {
    const periodStart = new Date(usage.period_start)
    const diffTime = Math.abs(now.getTime() - periodStart.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let currentCount = usage.generation_count

    // 2. If >= 30 days, reset count and period start
    if (diffDays >= 30) {
      currentCount = 0
      periodStart.setTime(now.getTime())
    }

    // 3. If < 5: increment and allow
    if (currentCount < 5) {
      await supabase.from('dashboard_usage')
        .update({
          generation_count: currentCount + 1,
          period_start: periodStart.toISOString(),
          last_generated_at: now.toISOString()
        })
        .eq('user_id', userId)
        
      return { allowed: true, remaining: 4 - currentCount }
    } else {
      // 4. If >= 5: block and return reset date
      const resetsAt = new Date(periodStart.getTime() + (30 * 24 * 60 * 60 * 1000))
      return { allowed: false, remaining: 0, resetsAt: resetsAt.toISOString() }
    }
  }

  return { allowed: false, remaining: 0 }
}

export type FreeToolType = 'aidetector' | 'humanizer' | 'tutor' | 'grammar' | 'data_analyzer'

export async function checkFreeToolDailyUsage(userId: string, tool: FreeToolType): Promise<{ allowed: boolean, count: number, maxLimit: number, resetsAt: string, isPaid: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user && (user.email === 'adielasam2015@gmail.com' || user.email === 'adielasam20153@gmail.com')) {
    return { allowed: true, count: 0, maxLimit: Infinity, resetsAt: '', isPaid: true }
  }

  const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', userId).single()
  const plan = profile?.plan || 'free'
  
  if (plan !== 'free' && plan !== 'free trial') {
    return { allowed: true, count: 0, maxLimit: Infinity, resetsAt: '', isPaid: true }
  }

  const MAX_DAILY = 3 // 3 scans per day
  const actionMatch = tool === 'aidetector' ? 'AI Detection Scan' 
                    : tool === 'humanizer' ? 'Text Humanized' 
                    : tool === 'tutor' ? 'AI Tutor Query' 
                    : tool === 'data_analyzer' ? 'Data Analysis Run'
                    : 'Grammar Check'

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  
  const nextReset = new Date(startOfDay)
  nextReset.setUTCDate(nextReset.getUTCDate() + 1)
  
  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', actionMatch)
    .gte('created_at', startOfDay.toISOString())

  const usageCount = count || 0

  return {
    allowed: usageCount < MAX_DAILY,
    count: usageCount,
    maxLimit: MAX_DAILY,
    resetsAt: nextReset.toISOString(),
    isPaid: false
  }
}
