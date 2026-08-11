'use client'

import { useEffect, useState } from 'react'
import { trackAndGetStreak } from '@/app/actions/logins'
import { Flame } from 'lucide-react'

export function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    // Only track once per browser session to save DB writes
    const hasTracked = sessionStorage.getItem('sovira_streak_tracked')
    
    trackAndGetStreak().then(res => {
      setStreak(res.streak)
      if (!hasTracked) {
        sessionStorage.setItem('sovira_streak_tracked', 'true')
      }
    })
  }, [])

  if (streak === null || streak === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 rounded-full cursor-help group relative">
      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
      <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
        {streak} Day Streak
      </span>
      
      {/* Tooltip */}
      <div className="absolute top-full mt-2 right-0 w-48 p-2 bg-slate-800 text-xs text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center">
        Keep logging in daily to unlock premium rewards!
      </div>
    </div>
  )
}
