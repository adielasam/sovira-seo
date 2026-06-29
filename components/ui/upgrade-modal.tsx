'use client'

import { useState, useEffect } from 'react'
import { Rocket, Check, X } from 'lucide-react'

export function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('You have reached your Free plan limit.')

  useEffect(() => {
    const handleShow = (e: any) => {
      setMessage(e.detail?.message || 'You have reached your Free plan limit.')
      setIsOpen(true)
    }
    
    window.addEventListener('show-upgrade-modal', handleShow)
    return () => window.removeEventListener('show-upgrade-modal', handleShow)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E293B] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 animate-in zoom-in-95 duration-200">
        <div className="relative p-6 pt-8 text-center bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-[#1E293B]">
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Rocket className="w-8 h-8 text-blue-600 dark:text-blue-400 -rotate-3" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upgrade to Pro</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {message}
          </p>
        </div>
        
        <div className="p-6">
          <ul className="space-y-3 mb-8">
            {[
              'Unlimited SEO audits',
              'Unlimited content generation',
              'Unlimited keyword research',
              'Export directly to WordPress & Webflow'
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400 stroke-[3]" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => {
              setIsOpen(false)
              window.location.href = '/settings/billing' // redirect to billing
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            Upgrade Now - $29/mo
          </button>
        </div>
      </div>
    </div>
  )
}
