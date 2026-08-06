'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function getRecentSocialProof() {
  try {
    const supabase = createAdminClient()
    
    // Calculate the timestamp for 6 hours ago
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('activity_logs')
      .select('action, city, created_at')
      .in('action', ['signup', 'trial-start', 'audit-run', 'content-generated'])
      .gte('created_at', sixHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching social proof:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching social proof:', error)
    return []
  }
}
