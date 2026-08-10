'use client'

import { Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function SiteActions({ slug }: { slug: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = () => {
    window.location.href = `/html-host?edit=${slug}`
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/html-host/delete?slug=${slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete site')
      }
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error deleting site')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <button
        onClick={handleEdit}
        disabled={isDeleting}
        className="flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
      >
        <Edit className="w-4 h-4" />
        Edit Code
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? '...' : 'Delete'}
      </button>
    </div>
  )
}
