'use client'

import { useState, useEffect } from 'react'
import { getRecentSocialProof } from '@/app/actions/social-proof'
import { X } from 'lucide-react'

type SocialProofEvent = {
  action: string
  city: string | null
  created_at: string
}

export function SocialProofToast() {
  const [events, setEvents] = useState<SocialProofEvent[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      const data = await getRecentSocialProof()
      if (data && data.length > 0) {
        setEvents(data)
        
        // Start the first toast after 3 seconds
        setTimeout(() => {
          setCurrentIndex(0)
        }, 3000)
      }
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < events.length) {
      setIsRendered(true)
      // Slight delay to allow DOM render before triggering CSS transition
      setTimeout(() => setIsVisible(true), 50)

      // Auto dismiss after 6 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false)
      }, 6000)

      // Schedule next toast between 60 to 90 seconds
      const nextDelay = Math.floor(Math.random() * (90000 - 60000 + 1)) + 60000
      const nextTimer = setTimeout(() => {
        setIsRendered(false)
        setCurrentIndex(prev => prev + 1)
      }, nextDelay)

      return () => {
        clearTimeout(hideTimer)
        clearTimeout(nextTimer)
      }
    }
  }, [currentIndex, events.length])

  if (events.length === 0 || currentIndex >= events.length || !isRendered) return null

  const currentEvent = events[currentIndex]
  if (!currentEvent) return null

  // Format the text
  const actionTextMap: Record<string, string> = {
    'signup': 'signed up for a free trial',
    'trial-start': 'started a free trial',
    'audit-run': 'ran an SEO audit',
    'content-generated': 'generated SEO content'
  }

  const actionText = actionTextMap[currentEvent.action] || 'performed an action'
  
  const text = currentEvent.city 
    ? `Someone in ${currentEvent.city} just ${actionText}`
    : `Someone just ${actionText}`

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-white dark:bg-[#1E293B] shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 rounded-full px-5 py-3 pr-4 max-w-sm transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}`}
    >
      {/* A small decorative icon */}
      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
        <span className="text-blue-600 dark:text-blue-400 text-lg">⚡</span>
      </div>
      
      <div className="flex-grow text-sm font-medium text-slate-800 dark:text-slate-200">
        {text}
      </div>

      <button 
        onClick={() => setIsVisible(false)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 flex-shrink-0"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
