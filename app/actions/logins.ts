'use server'

import { createClient } from '@/lib/supabase/server'

export async function trackAndGetStreak() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { streak: 0 }

  // 1. Get recent logins
  const { data: logins } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('action', 'LOGIN')
    .order('created_at', { ascending: false })
    .limit(30)

  const todayStr = new Date().toISOString().split('T')[0]
  
  if (!logins || logins.length === 0) {
    // First ever login
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      details: 'Daily Login'
    })
    return { streak: 1 }
  }

  // Calculate streak based on unique dates
  const loginDates = [...new Set(logins.map(log => new Date(log.created_at).toISOString().split('T')[0]))]
  
  let currentStreak = 0
  let expectedDate = new Date()

  // Did they log in today?
  let loggedInToday = loginDates[0] === todayStr

  // If they haven't logged in today, record it!
  if (!loggedInToday) {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      details: 'Daily Login'
    })
    loginDates.unshift(todayStr) // Add today to front for streak calc
  }

  // Calculate consecutive days backwards
  for (let i = 0; i < loginDates.length; i++) {
    const logDate = loginDates[i]
    const expectedStr = expectedDate.toISOString().split('T')[0]
    
    if (logDate === expectedStr) {
      currentStreak++
      // subtract 1 day
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      break
    }
  }

  return { streak: currentStreak }
}
