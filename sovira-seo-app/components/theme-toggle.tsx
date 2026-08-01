"use client"
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' 
        ? <Sun className="w-4 h-4 text-yellow-400" />
        : <Moon className="w-4 h-4 text-slate-600" />
      }
    </button>
  )
}
