'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Tag, Sparkles, Menu, X, Link as LinkIcon, TrendingUp, Users, Settings, PlaySquare, Bot, Video, FileText, Plug, Flame, Shield, GraduationCap, Radar } from 'lucide-react'
import { useState } from 'react'

const mainLinks = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Audit', href: '/audit', icon: Search },
  { name: 'Keywords', href: '/keywords', icon: Tag },
  { name: 'Content', href: '/content', icon: Sparkles },
]

const moreGroups = [
  {
    name: 'AI Search',
    items: [
      { name: 'Rank Tracker', href: '/rank-tracker', icon: TrendingUp },
      { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
      { name: 'AI Search (GEO)', href: '/ai-search-optimization', icon: Bot },
    ]
  },
  {
    name: 'AI Humanizer',
    items: [
      { name: 'Humanizer', href: '/humanizer', icon: Shield },
      { name: 'AI Detector', href: '/ai-detector', icon: Radar },
    ]
  },
  {
    name: 'Marketing',
    items: [
      { name: 'YouTube SEO', href: '/youtube-seo', icon: PlaySquare },
      { name: 'Trending Topics', href: '/trending', icon: Flame },
      { name: 'Competitors', href: '/competitors', icon: Users },
      { name: 'AI Video', href: '/ai-video', icon: Video },
    ]
  },
  {
    name: 'Administration',
    items: [
      { name: 'Teacher Tools', href: '/teacher-tools', icon: GraduationCap },
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Integrations', href: '/integrations', icon: Plug },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
]

export function BottomNav() {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  return (
    <>
      {/* Bottom Nav Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-800 h-16 z-50 flex items-center justify-around px-2">
        {mainLinks.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setIsMoreOpen(false)}
            >
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isMoreOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {isMoreOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* Slide-up More Menu */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-16 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 flex flex-col gap-4 rounded-t-2xl animate-in slide-in-from-bottom-2 duration-200 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2 px-2 shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">More Options</h3>
          </div>
          
          {moreGroups.map((group) => (
            <div key={group.name} className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                {group.name}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 active:bg-blue-50 dark:active:bg-blue-900/20"
                  >
                    <link.icon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-medium truncate">{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
