'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-50 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <nav className="flex items-center justify-between h-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/soviraseologo.png"
                alt="Sovira SEO"
                width={280}
                height={80}
                className="h-16 w-auto object-contain dark:brightness-90"
                priority
              />
            </Link>
          </div>
          
          <div className="flex items-center gap-6 ml-auto shrink-0">
            <div className="hidden md:flex gap-6 items-center">
              <Link href="/#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Features</Link>
              <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">How it Works</Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Pricing</Link>
            </div>
            
            <ThemeToggle />
            
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="hidden sm:block text-sm font-semibold text-[#0F172A] dark:text-white hover:text-blue-600 transition-colors">
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 hover:shadow-lg transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
            <button 
              className="md:hidden p-2 text-[#0F172A] dark:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
      </header>
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 z-40 left-0 w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-lg py-4 px-4 flex flex-col gap-4">
            <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Features</Link>
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">How it Works</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Pricing</Link>
            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Log in</Link>
        </div>
      )}
    </>
  )
}
