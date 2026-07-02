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
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pt-32 pb-8 px-4">
        <div className="relative bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] text-center max-w-md ring-1 ring-white/50 dark:ring-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden">
          {/* Subtle gradient glow behind the modal */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 flex items-center justify-center rounded-2xl shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] mb-6 transform rotate-3 hover:rotate-0 transition-transform">
              <Lock className="w-7 h-7 text-white" />
            </div>
            
            <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-3 tracking-tight">
              Unlock Deep Insights
            </h3>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              You're previewing the top results. Upgrade to a premium plan to reveal the full data, advanced metrics, and export capabilities.
            </p>
            
            <Link
              href="/pricing"
              className="group relative w-full inline-flex justify-center items-center px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] text-white rounded-xl text-[15px] font-bold hover:bg-right transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Upgrade to Pro <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
