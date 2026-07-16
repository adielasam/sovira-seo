import { createClient } from './supabase/server'

export async function checkUsageLimit(userId: string, actionType: 'audit' | 'keyword' | 'words' | 'image' | 'video' | 'insight'): Promise<{ allowed: boolean, limitReached: boolean, maxLimit: number }> {
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

  // Define limits for all plans
  const limits: Record<string, Record<string, number>> = {
    free: { keyword: 10, audit: 5, words: 1000, image: 1, video: 0, insight: 0 },
    starter: { keyword: 50, audit: 50, words: 10000, image: 15, video: 1, insight: 0 },
    pro: { keyword: 500, audit: Infinity, words: 100000, image: 100, video: 3, insight: Infinity },
    agency: { keyword: 5000, audit: Infinity, words: Infinity, image: 500, video: 15, insight: Infinity },
  }

  const userLimits = limits[plan] || limits['free']
  const maxLimit = userLimits[actionType]

  if (maxLimit === 0) {
    return { allowed: false, limitReached: true, maxLimit }
  }
  if (maxLimit === Infinity) {
    return { allowed: true, limitReached: false, maxLimit }
  }
  
  // Count usage in the current billing cycle (last 30 days for now)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

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
      .gte('created_at', thirtyDaysAgo.toISOString())

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
  
  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', actionMatch)
    .gte('created_at', thirtyDaysAgo.toISOString())
    
  if (count !== null && count >= maxLimit) {
    return { allowed: false, limitReached: true, maxLimit }
  }
  
  return { allowed: true, limitReached: false, maxLimit }
}
