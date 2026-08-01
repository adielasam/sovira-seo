'use client'

import { Ban, Activity, CheckCircle, ShieldUser } from 'lucide-react'
import { toggleUserSuspension, promoteToAdmin } from './actions'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function UserActions({ user, isSuperAdmin }: { user: any, isSuperAdmin?: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isSuspended = user.role === 'suspended'

  const handleToggleSuspend = async () => {
    if (user.role === 'admin') {
      alert("You cannot suspend an admin account.")
      return
    }
    
    const confirmMessage = isSuspended 
      ? 'Are you sure you want to reactivate this user?' 
      : 'Are you sure you want to suspend this user? They will not be able to access the dashboard.'
      
    if (!confirm(confirmMessage)) return

    setLoading(true)
    const res = await toggleUserSuspension(user.id, user.role)
    if (res.error) {
      alert(res.error)
    }
    setLoading(false)
  }

  const handleMakeAdmin = async () => {
    if (!confirm('Are you sure you want to promote this user to an Admin? They will have full access to manage users, blogs, and content.')) return
    
    setLoading(true)
    const res = await promoteToAdmin(user.id)
    if (res.error) {
      alert(res.error)
    } else {
      alert('User successfully promoted to Admin!')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link 
        href={`/admin/activity?user_id=${user.id}`}
        title="View User Activity" 
        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
      >
        <Activity className="w-4 h-4" />
      </Link>
      
      {isSuperAdmin && user.role !== 'admin' && (
        <button
          onClick={handleMakeAdmin}
          disabled={loading}
          title="Make Admin"
          className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors disabled:opacity-50"
        >
          <ShieldUser className="w-4 h-4" />
        </button>
      )}
      
      <button 
        onClick={handleToggleSuspend}
        disabled={loading || user.role === 'admin'}
        title={isSuspended ? "Reactivate User" : "Suspend User"} 
        className={`p-1.5 transition-colors ${
          isSuspended 
            ? 'text-red-500 hover:text-green-600' 
            : 'text-slate-400 hover:text-red-600'
        } ${(loading || user.role === 'admin') ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isSuspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
      </button>
    </div>
  )
}
