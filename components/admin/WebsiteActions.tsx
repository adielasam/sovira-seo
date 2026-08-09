'use client'

import { useState } from 'react'
import { Play, Pause, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function WebsiteActions({ currentSlug, isPaused }: { currentSlug: string, isPaused: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/websites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSlug, isPaused })
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to toggle status')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this website and all its files?')) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/websites/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSlug })
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete website')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button 
        onClick={handleToggle}
        disabled={isLoading}
        title={isPaused ? "Resume Website" : "Pause Website"}
        className={`p-1.5 rounded transition-colors ${
          isPaused 
            ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30' 
            : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30'
        }`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>
      <button 
        onClick={handleDelete}
        disabled={isLoading}
        title="Delete Website"
        className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
