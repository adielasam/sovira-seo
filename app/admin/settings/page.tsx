'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    
    // Supabase automatically hashes (bcrypt) and securely stores the password.
    // It is NEVER stored in plaintext in the database or frontend.
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully! It has been securely encrypted.')
      setPassword('')
      setConfirmPassword('')
      
      // Log this activity
      fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Password Updated', details: { context: 'Admin Settings' } })
      }).catch(console.error)
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          Security Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your account security and authentication.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            Update Password
          </h2>
        </div>
        
        <form onSubmit={handleUpdatePassword} className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Secure Storage:</strong> Your new password will be hashed and heavily encrypted before being saved. It is never stored as plain text or hardcoded anywhere in the frontend or database.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Confirm new password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {isLoading ? 'Encrypting & Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
