'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Download, X } from 'lucide-react'

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
      return
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
    
    // Check if previously dismissed
    if (localStorage.getItem('sovira_pwa_dismissed') === 'true') {
      return
    }

    // On iOS, we can't show native prompt, so we automatically show our own banner
    if (isIosDevice) {
      setShowPrompt(true)
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert("To install on iOS: tap the Share button (square with arrow pointing up) at the bottom of the screen, then scroll down and select 'Add to Home Screen'.")
      }
      return
    }
    
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('sovira_pwa_dismissed', 'true')
  }

  // If installed or not showing prompt
  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-[#111] dark:bg-[#111] text-white rounded-lg shadow-2xl p-4 flex gap-4 animate-in slide-in-from-bottom-5">
      <div className="mt-1 text-gray-400">
        <Smartphone className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-[15px]">Install Sovira AI</h3>
          <button 
            onClick={handleDismiss} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-[13px] mb-3 leading-relaxed">
          Get our AI SEO app with offline access and faster performance
        </p>
        <button 
          onClick={handleInstall}
          className="flex items-center gap-2 text-[14px] font-medium hover:text-blue-400 transition-colors"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
      </div>
    </div>
  )
}
