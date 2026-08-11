import { SupabaseClient } from '@supabase/supabase-js'

export type UsageCheckResult = {
  allowed: boolean
  remaining: number
  limit: number
  error?: string
}

export async function checkAndLogUsageLimit(
  supabase: SupabaseClient, 
  user: { id: string, email?: string },
  toolName: string
): Promise<UsageCheckResult> {
  // 1. Bypass for Agency Account
  if (user.email === 'adielasam2015@gmail.com') {
    return { allowed: true, remaining: 9999, limit: 9999 }
  }

  // 2. Fetch User Plan
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const isPaid = ['starter', 'pro', 'agency'].includes(plan)
  
  const limit = isPaid ? 15 : 3

  // 3. Check today's usage in activity_logs
  const todayStr = new Date().toISOString().split('T')[0]
  const todayStart = `${todayStr}T00:00:00.000Z`

  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', 'TOOL_USAGE')
    .gte('created_at', todayStart)

  const usedToday = count || 0
  const remaining = limit - usedToday

  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0, 
      limit, 
      error: isPaid 
        ? 'Daily limit reached.' 
        : 'Free plan limit reached. Upgrade to the 5000 plan for 15 daily uses!' 
    }
  }

  // 4. Log the usage if allowed
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'TOOL_USAGE',
    details: toolName
  })

  return { allowed: true, remaining: remaining - 1, limit }
}
