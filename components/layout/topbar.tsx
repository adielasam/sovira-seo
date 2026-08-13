'use client'

import { Bell, LogOut, Check, Info, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications'
import { StreakBadge } from '@/components/ui/streak-badge'

function getPageName(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard Overview'
  const parts = pathname.split('/')
  const lastPart = parts[parts.length - 1]
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ')
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + "y ago"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + "mo ago"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + "d ago"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + "h ago"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + "m ago"
  return "Just now"
}

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U'
  const pathname = usePathname()
  const router = useRouter()
  const pageName = getPageName(pathname)

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)
  const [isPaidPlan, setIsPaidPlan] = useState(false)
  
  const fetchNotifs = async () => {
    const { data } = await getNotifications()
    if (data) {
      // Merge DB state with local read state to handle global notifications
      const localReadIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
      const mergedData = data.map((n: any) => ({
        ...n,
        is_read: n.is_read || localReadIds.includes(n.id)
      }))
      setNotifications(mergedData)
    } else {
      setNotifications([])
    }
  }

  const fetchUserData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('role, plan').eq('id', user.id).single()
      if (profile?.role === 'admin') {
        setIsAdmin(true)
      }

      const plan = profile?.plan || 'free'
      if (plan !== 'free') {
        setIsPaidPlan(true)
      } else {
        const signupDate = new Date(user.created_at).getTime()
        const msSinceSignup = Date.now() - signupDate
        const daysSinceSignup = Math.floor(msSinceSignup / (1000 * 60 * 60 * 24))
        setTrialDaysRemaining(14 - daysSinceSignup)
      }
    }
  }

  useEffect(() => {
    fetchNotifs()
    fetchUserData()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    // Log activity using API
    await fetch('/api/log-activity', {
       method: 'POST',
       body: JSON.stringify({ action: 'logout', details: {} })
    }).catch(console.error)
    
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Update local state and localStorage for instant, robust UX (especially for global notifications)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    const localReadIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
    if (!localReadIds.includes(id)) {
      localStorage.setItem('read_notifications', JSON.stringify([...localReadIds, id]))
    }
    
    // Attempt DB update (will work for personal, silently fail for global due to RLS, which is intended)
    await markNotificationAsRead(id)
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    
    const localReadIds = JSON.parse(localStorage.getItem('read_notifications') || '[]')
    const newIds = notifications.map(n => n.id)
    const combinedIds = Array.from(new Set([...localReadIds, ...newIds]))
    localStorage.setItem('read_notifications', JSON.stringify(combinedIds))

    await markAllNotificationsAsRead()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-16 pr-4 shadow-sm sm:gap-x-6 sm:pl-16 sm:pr-6 lg:px-8 transition-colors duration-200">
      
      {/* Breadcrumb / Page Title */}
      <div className="flex flex-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {pageName}
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <StreakBadge />
        <ThemeToggle />
        
        {/* Trial Indicator */}
        {!isPaidPlan && trialDaysRemaining !== null && (
          <div className="hidden sm:flex items-center mr-2">
            {trialDaysRemaining > 1 ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                {trialDaysRemaining} days left in your free trial
              </span>
            ) : trialDaysRemaining === 1 || trialDaysRemaining === 0 ? (
              <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-700/10 dark:ring-orange-400/20">
                Trial ends today
              </span>
            ) : (
              <Link href="/pricing" className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-700/10 dark:ring-red-400/20 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                Your trial has ended — upgrade to keep access
              </Link>
            )}
          </div>
        )}


        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            type="button" 
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2.5 w-[380px] origin-top-right rounded-2xl bg-white dark:bg-[#0B1120] shadow-2xl border border-gray-100 dark:border-slate-800 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[450px] ring-1 ring-black/5 dark:ring-white/10">
              <div className="px-5 py-4 flex justify-between items-center bg-transparent">
                <h3 className="font-bold text-[15px] text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <Bell className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">All caught up!</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Check back later for new notifications.</p>
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {notifications.map((n) => (
                      <li 
                        key={n.id} 
                        onClick={(e) => handleMarkAsRead(n.id, e as any)}
                        className={`group relative px-5 py-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-[#131C31] cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-[#0F172A]' : 'opacity-70 hover:opacity-100'}`}
                      >
                        <div className={`mt-0.5 rounded-full p-2.5 flex-shrink-0 h-fit transition-colors ${n.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50' : n.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50'}`}>
                          {n.type === 'success' ? <CheckCircle className="w-5 h-5" /> : n.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className={`text-[14px] font-semibold leading-tight mb-1 ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          <p className="text-[13px] text-gray-500 dark:text-slate-400 leading-snug mb-2 line-clamp-2 pr-4">
                            {n.message}
                          </p>
                          <span className="text-[11px] font-medium text-gray-400 dark:text-slate-500">
                            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!n.is_read && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-slate-700" aria-hidden="true" />
      </div>
    </div>
  )
}
