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
      
      {/* Gradient Blur Overlay starting later so top rows are visible */}
      <div 
        className="absolute inset-x-0 bottom-0 top-[10%] z-10 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, transparent 10%, black 40%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, transparent 10%, black 40%)'
        }}
      ></div>
      
      {/* Premium Overlay Modal */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pt-24 pb-4 px-4">
        <div className="relative bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-2xl p-6 rounded-2xl shadow-xl text-center max-w-sm ring-1 ring-slate-200 dark:ring-slate-700 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden">
          {/* Subtle brand glow behind the modal */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-12 h-12 flex items-center justify-center rounded-xl shadow-sm mb-4">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
              Unlock Deep Insights
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              You're previewing the top results. Upgrade to a premium plan to reveal full data, metrics, and exports.
            </p>
            
            <Link
              href="/pricing"
              className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
