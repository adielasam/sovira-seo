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

  // We now just return the raw login dates, and calculate the actual streak on the client side
  // to ensure perfectly consistent timezone handling (PC vs Mobile).
  
  const loginDates = [...new Set(logins.map(log => log.created_at))]
  
  // Did they log in within the last 24 hours in UTC? Just ensure there's a recent record.
  // We'll let the client do the precise "today" insertion.
  let loggedInToday = logins.some(log => log.created_at.startsWith(todayStr))
  
  if (!loggedInToday) {
    const { data: newLog } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      details: 'Daily Login'
    }).select('created_at').single()
    if (newLog) {
      loginDates.unshift(newLog.created_at)
    }
  }

  return { loginDates }
}
