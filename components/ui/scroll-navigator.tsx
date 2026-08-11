'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

export function ScrollNavigator() {
  const [direction, setDirection] = useState<'up' | 'down'>('down')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button after a tiny bit of scrolling
      if (window.scrollY > 100) {
        setIsVisible(true)
      } else {
        setIsVisible(true)
      }

      // Check if we are near the bottom of the page
      const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500
      
      if (isNearBottom) {
        setDirection('up')
      } else {
        setDirection('down')
      }
    }

    // Initial check
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    if (direction === 'down') {
      // Scroll to bottom
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    } else {
      // Scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center border border-slate-200/20
        ${direction === 'up' 
          ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-slate-900/20 dark:shadow-white/20' 
          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
        }`}
      aria-label={direction === 'up' ? 'Scroll to top' : 'Scroll to bottom'}
    >
      {direction === 'up' ? (
        <ArrowUp className="w-6 h-6" />
      ) : (
        <ArrowDown className="w-6 h-6" />
      )}
    </button>
  )
}
