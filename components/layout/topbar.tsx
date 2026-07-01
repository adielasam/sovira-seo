'use client'

import { Bell, LogOut, Check, Info, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications'

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

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  
  const fetchNotifs = async () => {
    const { data } = await getNotifications()
    setNotifications(data || [])
  }

  const fetchRole = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'admin') {
        setIsAdmin(true)
      }
    }
  }

  useEffect(() => {
    fetchNotifs()
    fetchRole()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
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
    await markNotificationAsRead(id)
    fetchNotifs()
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead()
    fetchNotifs()
    setNotifOpen(false)
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
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <ThemeToggle />
        
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
            <div className="absolute right-0 mt-2.5 w-80 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[400px]">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No notifications yet</div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {notifications.map((n) => (
                      <li 
                        key={n.id} 
                        onClick={(e) => handleMarkAsRead(n.id, e as any)}
                        className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className={`mt-0.5 rounded-full p-1.5 flex-shrink-0 h-fit ${n.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : n.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {n.type === 'success' ? <CheckCircle className="w-4 h-4" /> : n.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 self-center"></div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-slate-700" aria-hidden="true" />

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-x-4 outline-none cursor-pointer"
          >
            <span className="hidden lg:flex lg:items-center">
              <span className="text-sm font-medium leading-6 text-gray-700 dark:text-slate-300 max-w-[150px] truncate" aria-hidden="true">
                {userEmail}
              </span>
            </span>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform hover:scale-105">
              {initial}
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-64 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 py-2 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {userEmail}
                </p>
                <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 w-max">
                  Manage Account
                </span>
              </div>
              
              <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
              
              <Link 
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                Account Settings
              </Link>
              <Link 
                href="/settings?tab=billing"
                onClick={() => setDropdownOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                Billing
              </Link>
              
              {isAdmin && (
                <>
                  <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
                  
                  <Link 
                    href="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-semibold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Switch to Admin Panel
                  </Link>
                </>
              )}
              
              <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
