'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cpu, History, Plug, Settings, ShieldCheck } from 'lucide-react'

const tabs = [
  { name: 'Task Workspace', href: '/assistant', icon: Cpu },
  { name: 'Connected Accounts', href: '/assistant/integrations', icon: Plug },
  { name: 'Automation History', href: '/assistant/history', icon: History },
  { name: 'Private Settings', href: '/assistant/settings', icon: Settings },
]

export function AssistantNav({ workerOnline }: { workerOnline?: boolean }) {
  const pathname = usePathname()

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sovira AI Task Assistant
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Private Owner Verified
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Single-user executive orchestration hub for planning, approval, durable automation, and Telegram control.
          </p>
        </div>

        {typeof workerOnline === 'boolean' && (
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              workerOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                workerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {workerOnline ? 'Background Worker Online' : 'Background Worker Offline'}
          </div>
        )}
      </div>

      <nav
        aria-label="Sovira Assistant Navigation"
        className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
