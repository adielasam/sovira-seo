'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('App Error caught:', error)
    
    // Auto-reload on chunk load errors (happens when app is redeployed while user has tab open)
    const isChunkLoadError = error.message?.toLowerCase().includes('failed to fetch') || 
                             error.message?.toLowerCase().includes('chunk') ||
                             error.message?.toLowerCase().includes('fetch')
                             
    if (isChunkLoadError) {
      const reloaded = sessionStorage.getItem('sovira_chunk_reload')
      if (!reloaded) {
        sessionStorage.setItem('sovira_chunk_reload', 'true')
        window.location.reload()
      } else {
        // We already tried reloading once, don't loop infinitely
        sessionStorage.removeItem('sovira_chunk_reload')
      }
    }
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Something went wrong
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
          We encountered an unexpected error while loading this page. This usually happens when the app has been updated.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem('sovira_chunk_reload')
              window.location.reload()
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Page
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}
