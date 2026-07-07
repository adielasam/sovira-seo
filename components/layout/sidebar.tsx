'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Search, Tag, Users, Sparkles,
  TrendingUp, Link as LinkIcon, FileText, Settings, LogOut, Menu, X, Plug
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
const navigation = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'SEO Audit', href: '/audit', icon: Search },
  { name: 'Keywords', href: '/keywords', icon: Tag },
  { name: 'Competitors', href: '/competitors', icon: Users },
  { name: 'Content AI', href: '/content', icon: Sparkles },
  { name: 'Rank Tracker', href: '/rank-tracker', icon: TrendingUp },
  { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function NavItems({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <ul role="list" className="-mx-2 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              onClick={onNav}
              className={`
                group flex gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }
              `}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

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
              src="/soviraseologo.png"
              alt="Sovira SEO"
              width={130}
              height={36}
              className="h-8 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col mt-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <NavItems pathname={pathname} onNav={() => setMobileOpen(false)} />
            </li>
            <li className="mt-auto">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-white" />
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Desktop fixed sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 border-r border-slate-800 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center mt-2">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/soviraseologo.png"
                alt="Sovira SEO"
                width={130}
                height={36}
                className="h-8 w-auto object-contain brightness-0 invert"
                priority
              />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <NavItems pathname={pathname} />
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-white" />
                  {loggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}
