'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function getPublicStats() {
  try {
    const supabase = createAdminClient()

    const [usersRes, auditsRes, keywordsRes] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('audits').select('*', { count: 'exact', head: true }),
      supabase.from('tracked_keywords').select('*', { count: 'exact', head: true })
    ])

    return {
      activeMarketers: usersRes.count || 0,
      auditsCompleted: auditsRes.count || 0,
      keywordsTracked: keywordsRes.count || 0,
    }
  } catch (error) {
    console.error('Error fetching public stats:', error)
    return {
      activeMarketers: 0,
      auditsCompleted: 0,
      keywordsTracked: 0,
    }
  }
}

export async function getTestimonials() {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('permission_granted', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return []
  }
}
