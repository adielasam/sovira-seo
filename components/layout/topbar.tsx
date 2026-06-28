'use client'

import { Bell, LogOut } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function getPageName(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard Overview'
  const parts = pathname.split('/')
  const lastPart = parts[parts.length - 1]
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ')
}

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U'
  const pathname = usePathname()
  const router = useRouter()
  const pageName = getPageName(pathname)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
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
    await supabase.auth.signOut()
    router.push('/')
  }

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
        
        <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
          <span className="sr-only">View notifications</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-slate-700" aria-hidden="true" />

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-x-4 outline-none"
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
                  Free Plan
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
