'use client'

import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface PaywallBlurProps {
  isPro: boolean
  children: React.ReactNode
}

export function PaywallBlur({ isPro, children }: PaywallBlurProps) {
  if (isPro) {
    return <>{children}</>
  }

  return (
    <div className="relative group rounded-xl overflow-hidden min-h-[300px]">
      {/* Clear Content */}
      <div className="select-none pointer-events-none">
        {children}
      </div>
      
      {/* Gradient Blur Overlay starting from top 15% */}
      <div 
        className="absolute inset-x-0 bottom-0 top-[15%] z-10 backdrop-blur-md bg-white/40 dark:bg-slate-900/40"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 15%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)'
        }}
      ></div>
      
      {/* Overlay Modal */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pt-24">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-6 rounded-2xl shadow-xl text-center max-w-sm ring-1 ring-slate-200 dark:ring-slate-700 animate-in zoom-in-95 duration-200">
          <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-12 h-12 flex items-center justify-center rounded-full mb-4">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pro Feature</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Upgrade to a premium plan to view detailed insights, metrics, and unlock the full potential of Sovira SEO.
          </p>
          <Link
            href="/pricing"
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  )
}
