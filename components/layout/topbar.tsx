'use client'

import { Bell } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

function getPageName(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard Overview'
  const parts = pathname.split('/')
  const lastPart = parts[parts.length - 1]
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ')
}

export function Topbar({ userEmail }: { userEmail: string | undefined }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U'
  const pathname = usePathname()
  const pageName = getPageName(pathname)

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

        <div className="flex items-center gap-x-4">
          <span className="hidden lg:flex lg:items-center">
            <span className="text-sm font-medium leading-6 text-gray-700 dark:text-slate-300" aria-hidden="true">
              {userEmail}
            </span>
          </span>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {initial}
          </div>
        </div>
      </div>
    </div>
  )
}
