'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useMemo, useRef } from 'react'
import {
  LayoutDashboard, Search, Tag, Users, Sparkles,
  TrendingUp, Link as LinkIcon, FileText, Settings, LogOut, Menu, X, Plug, PlaySquare, Bot, Video, Flame, Shield, GraduationCap, Radar, BarChart2, Presentation, Code, Globe, ChevronLeft
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
const navigationGroups = [
  {
    name: 'AI Search',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Data Analyser', href: '/dashboard/analyser', icon: BarChart2 },
      { name: 'Site Audit', href: '/audit', icon: Search },
      { name: 'Rank Tracker', href: '/rank-tracker', icon: TrendingUp },
      { name: 'Keywords', href: '/keywords', icon: Tag },
      { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
      { name: 'AI Search (GEO)', href: '/ai-search-optimization', icon: Bot },
      { name: 'AI Tutor', href: '/ai-tutor', icon: GraduationCap },
      { name: 'Slides Agent', href: '/slides-agent', icon: Presentation },
    ]
  },
  {
    name: 'AI Writing',
    items: [
      { name: 'Content AI', href: '/content', icon: Sparkles },
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
    name: 'Developer Tools',
    items: [
      { name: 'InstantSite', href: '/html-host', icon: Code },
      { name: 'My Websites', href: '/dashboard/websites', icon: Globe },
      { name: 'RAG Chatbots', href: '/chatbots', icon: Bot },
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

function NavItems({ pathname, onNav, isCollapsed = false, searchQuery = '' }: { pathname: string; onNav?: () => void; isCollapsed?: boolean; searchQuery?: string }) {
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navigationGroups
    const lowerQuery = searchQuery.toLowerCase()
    return navigationGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item.name.toLowerCase().includes(lowerQuery))
    })).filter(group => group.items.length > 0)
  }, [searchQuery])

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center text-sm text-slate-500 py-4 desktop-hide-collapsed">
        No results found.
      </div>
    )
  }

  return (
    <ul role="list" className="flex flex-1 flex-col gap-y-7 -mx-2">
      {filteredGroups.map((group) => (
        <li key={group.name}>
          <div className="text-xs font-semibold leading-6 text-slate-400 px-2 uppercase tracking-wider mb-2 desktop-hide-collapsed">
            {group.name}
          </div>
          <ul role="list" className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onNav}
                    title={isCollapsed ? item.name : undefined}
                    className={`
                      group flex gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium transition-all duration-200 desktop-center-collapsed
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                      aria-hidden="true"
                    />
                    <span className="desktop-hide-collapsed">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync initial state with pre-hydration script to avoid mismatch flicker
  if (typeof window !== 'undefined' && !isCollapsed && document.documentElement.getAttribute('data-sidebar-collapsed') === 'true') {
    setIsCollapsed(true)
  }

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (newState) {
      document.documentElement.setAttribute('data-sidebar-collapsed', 'true')
      localStorage.setItem('sovira-sidebar-collapsed', 'true')
    } else {
      document.documentElement.removeAttribute('data-sidebar-collapsed')
      localStorage.setItem('sovira-sidebar-collapsed', 'false')
    }
  }

  const handleSearchIconClick = () => {
    if (isCollapsed) {
      toggleCollapse()
      setTimeout(() => searchInputRef.current?.focus(), 200)
    } else {
      searchInputRef.current?.focus()
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile hamburger button — only visible on small screens */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-900 border-r border-slate-800 px-6 pb-4
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between mt-2">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center">
            <Image
              src="/sovira-logo.png"
              alt="Sovira SEO"
              width={160}
              height={44}
              className="h-10 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 -mx-2 px-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col mt-4 overflow-y-auto overflow-x-hidden pb-8">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <NavItems pathname={pathname} onNav={() => setMobileOpen(false)} searchQuery={searchQuery} />
            </li>
            <li className="mt-auto pt-4">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 disabled:opacity-50"
              >
                <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-white" />
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Desktop fixed sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[var(--sidebar-width)] transition-[width] duration-200 ease-in-out lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 border-r border-slate-800 px-6 pb-4 overflow-x-hidden">
          <div className="flex h-16 shrink-0 items-center justify-between mt-2">
            <Link href="/dashboard" className="flex items-center desktop-hide-collapsed">
              <Image
                src="/sovira-logo.png"
                alt="Sovira SEO"
                width={160}
                height={44}
                className="h-10 w-auto object-contain brightness-0 invert"
                priority
              />
            </Link>
            <button 
              onClick={toggleCollapse} 
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 ml-auto"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          <div className="relative flex items-center -mx-2 px-2">
            <button 
              onClick={handleSearchIconClick} 
              className={`absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-white z-10 transition-colors ${isCollapsed ? 'left-1/2 -translate-x-1/2' : ''}`}
              title={isCollapsed ? "Search" : undefined}
            >
              <Search className="h-5 w-5 shrink-0" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-md py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 desktop-hide-collapsed transition-all"
            />
          </div>

          <nav className="flex flex-1 flex-col mt-2">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <NavItems pathname={pathname} isCollapsed={isCollapsed} searchQuery={searchQuery} />
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title={isCollapsed ? "Log out" : undefined}
                  className="group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 disabled:opacity-50 desktop-center-collapsed"
                >
                  <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-white" />
                  <span className="desktop-hide-collapsed">{loggingOut ? 'Logging out...' : 'Log out'}</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
