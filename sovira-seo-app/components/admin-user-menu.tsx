'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function AdminUserMenu({ initial }: { initial: string }) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-x-4 outline-none cursor-pointer"
      >
        <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform hover:scale-105">
          {initial}
        </div>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2.5 w-48 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 py-2 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200">
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
  )
}
