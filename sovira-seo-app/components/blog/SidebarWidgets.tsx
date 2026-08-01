'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function SidebarWidgets() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/blog?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="space-y-8 sticky top-24">
      {/* Search Widget */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-bold tracking-widest text-slate-900 dark:text-white uppercase mb-4">Search in Blog</h3>
        <form onSubmit={handleSearch} className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="I'm looking for..."
            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-r-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors">
            SEARCH
          </button>
        </form>
      </div>

      {/* Connect With Us Widget */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-bold tracking-widest text-slate-900 dark:text-white uppercase mb-4">Connect with us:</h3>
        <div className="flex gap-4">
          <a href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/dorvastechnologies/"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#1877F2] transition-colors p-2 bg-slate-50 dark:bg-slate-900 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
            </svg>
          </a>
          <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/in/samogide/"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#0A66C2] transition-colors p-2 bg-slate-50 dark:bg-slate-900 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
            </svg>
          </a>
          <a href={process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com/@samgoldtales"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#FF0000] transition-colors p-2 bg-slate-50 dark:bg-slate-900 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.498-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>

      {/* Ad Widget Placeholder */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 rounded-2xl shadow-lg text-white text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <Search className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2">Sovira SEO Audit</h3>
        <p className="text-blue-200 text-sm mb-6">Transform your website's search experience.</p>
        <a href="/audit" className="inline-block px-6 py-2 bg-white text-blue-900 font-bold rounded-lg hover:bg-slate-100 transition-colors">
          Start Free Audit
        </a>
      </div>
    </div>
  )
}
