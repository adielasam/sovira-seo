'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { loginAction } from '@/app/auth/actions'
import { Eye, EyeOff } from 'lucide-react'
import { AuthMessages } from '@/components/auth-messages'
import { Suspense } from 'react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 transition-colors duration-300">
      <Suspense fallback={null}>
        <AuthMessages />
      </Suspense>
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-[#1E293B] rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300">
        
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center mb-6">
            <Image
              src="/soviraseologo.png"
              alt="Sovira SEO"
              width={200}
              height={56}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome back</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Sign in to your account</p>
        </div>

        <form action={loginAction} className="space-y-6">
          <div className="space-y-5">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] px-4 py-3 pr-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 active:scale-[0.98]"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <Link href="/auth/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
