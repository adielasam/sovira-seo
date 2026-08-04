'use client'

import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function UserFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '')
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || '')

  const handleApply = () => {
    const params = new URLSearchParams(searchParams)
    
    if (searchTerm) params.set('search', searchTerm)
    else params.delete('search')
      
    if (roleFilter) params.set('role', roleFilter)
    else params.delete('role')

    if (planFilter) params.set('plan', planFilter)
    else params.delete('plan')

    router.push(`/admin?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply()
    }
  }

  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex gap-4 w-full md:w-auto">
        <div className="relative flex-1 md:w-40">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="relative flex-1 md:w-40">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
        </div>

        <button 
          onClick={handleApply}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
