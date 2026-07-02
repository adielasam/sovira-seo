import { createClient } from './supabase/server'

export async function checkUsageLimit(userId: string, actionType: 'generation' | 'audit' | 'keyword' | 'insight'): Promise<{ allowed: boolean, limitReached: boolean }> {
  const supabase = await createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single()
    
  const plan = profile?.plan || 'free'
  
  if (plan === 'pro' || plan === 'agency') {
    return { allowed: true, limitReached: false }
  }
  
  // For free tier, count usage in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // We approximate usage check by checking activity logs
  let actionMatch = ''
  if (actionType === 'generation') actionMatch = 'Content Generated'
  if (actionType === 'audit') actionMatch = 'Audit Run'
  if (actionType === 'keyword') actionMatch = 'Keyword Research'
  if (actionType === 'insight') actionMatch = 'Generated Rank Insight'
  
  // This is a naive check. For production, we'd have a usage_metrics table.
  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', actionMatch)
    .gte('created_at', thirtyDaysAgo.toISOString())
    
  const limits: Record<string, number> = {
    'generation': 3,
    'audit': 2,
    'keyword': 5,
    'insight': 1
  }
  
  if (count !== null && count >= limits[actionType]) {
    return { allowed: false, limitReached: true }
  }
  
  return { allowed: true, limitReached: false }
}
