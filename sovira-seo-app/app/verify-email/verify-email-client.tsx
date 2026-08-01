'use client'

import { useState, useEffect } from 'react'
import { Mail, ArrowRight, RefreshCw, LogOut } from 'lucide-react'
import { resendVerificationEmail, signOut } from './actions'

export function VerifyEmailClient({ email }: { email: string }) {
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0) return
    
    setIsResending(true)
    setMessage({ text: '', type: '' })
    
    const result = await resendVerificationEmail()
    
    setIsResending(false)
    
    if (result.error) {
      setMessage({ text: result.error, type: 'error' })
    } else {
      setMessage({ text: 'Verification email sent! Check your inbox.', type: 'success' })
      setCooldown(60) // 60 second cooldown
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-[#1E293B] rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 text-center">
      <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
        <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Check your email
      </h2>
      
      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        We've sent a verification link to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>. 
        Please click the link in that email to access your dashboard.
      </p>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 text-sm ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
            : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={isResending || cooldown > 0}
        className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 dark:disabled:bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] mb-4"
      >
        {isResending ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : cooldown > 0 ? (
          `Resend available in ${cooldown}s`
        ) : (
          <>
            Resend verification email
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        onClick={handleSignOut}
        className="w-full flex justify-center items-center gap-2 rounded-lg bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200"
      >
        <LogOut className="w-4 h-4" />
        Sign in with a different account
      </button>
    </div>
  )
}
