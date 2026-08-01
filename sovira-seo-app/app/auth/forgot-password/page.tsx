'use client'

import Link from 'next/link'
import { useState } from 'react'
import { resetPasswordAction } from '@/app/auth/actions'
import { TrendingUp, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    const result = await resetPasswordAction(formData)
    setIsLoading(false)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      setIsSuccess(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 transition-colors duration-300">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-[#1E293B] rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300">
        
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <span className="bg-blue-600 rounded-lg p-1.5">
              <TrendingUp className="w-6 h-6 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-500">Sovira SEO v2</span>
          </Link>
          
          {isSuccess ? (
            <>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Check your email</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We have sent a password reset link to your email address.
              </p>
              <div className="mt-8">
                <Link href="/auth/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Reset password</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </>
          )}
        </div>

        {!isSuccess && (
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
            
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Remember your password?{' '}
              <Link href="/auth/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
