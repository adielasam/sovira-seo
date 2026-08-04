'use client'

import { Info, Lightbulb, CheckCircle2 } from 'lucide-react'

interface InfographicSection {
  title: string
  key_point: string
  details: string
}

export function Infographic({ data }: { data: InfographicSection[] }) {
  if (!data || data.length === 0) return null

  const icons = [Lightbulb, Info, CheckCircle2]
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
  ]

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-8 relative">
      {/* Vertical line connecting timeline nodes */}
      <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block z-0" />

      {data.map((section, idx) => {
        const Icon = icons[idx % icons.length]
        const colorClass = colors[idx % colors.length]

        return (
          <div key={idx} className="relative z-10 flex flex-col sm:flex-row gap-6 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'backwards' }}>
            {/* Timeline Icon */}
            <div className={`shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg mx-auto sm:mx-0`}>
              <Icon className="w-8 h-8 text-white" />
            </div>

            {/* Content Card */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-10 rounded-full blur-3xl -mr-16 -mt-16`} />
              
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-bold">
                  {idx + 1}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {section.title}
                </h3>
              </div>
              
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-3 leading-snug">
                {section.key_point}
              </p>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {section.details}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
