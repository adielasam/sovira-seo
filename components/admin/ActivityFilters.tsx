'use client'

import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function ActivityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '')

  const handleApply = () => {
    const params = new URLSearchParams(searchParams)
    
    if (searchTerm) params.set('search', searchTerm)
    else params.delete('search')
      
    if (actionFilter) params.set('action', actionFilter)
    else params.delete('action')

    router.push(`/admin/activity?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply()
    }
  }

  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search user or details..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="relative max-w-xs w-full sm:w-auto">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="Data Analyzed">Data Analyzed</option>
          <option value="AI Video Generated">AI Video Generated</option>
          <option value="AI Image Generated">AI Image Generated</option>
          <option value="AI Search Optimization">AI Search Optimization</option>
          <option value="Text Humanized">Text Humanized</option>
          <option value="Report Generated">Report Generated</option>
          <option value="Report Scheduled">Report Scheduled</option>
          <option value="Content Generated">Content Generated</option>
          <option value="Audit Run">Audit Run</option>
          <option value="Backlink Scan Completed">Backlink Scan Completed</option>
        </select>
      </div>
      <button 
        onClick={handleApply}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
    </div>
  )
}
