'use client'

import { useState } from 'react'
import { Share2, X, Copy, Check } from 'lucide-react'

export function ShareButton({ title = "File" }: { title?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate a mock share link or use current URL
  const shareLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/share?shareKey=${Math.random().toString(36).substring(2, 15)}`
    : 'https://www.oreateai.com/share?shareKey=...'

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-8 right-8 w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 shadow-lg hover:shadow-xl transition-all border border-slate-100 z-50"
        title="Share"
      >
        <Share2 className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Share {title}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center">
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-sm text-slate-600 break-all select-all">
                {shareLink}
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
