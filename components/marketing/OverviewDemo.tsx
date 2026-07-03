'use client'

import { useState, useEffect } from 'react'
import { Activity, ArrowUpRight, CheckCircle2, TrendingUp, Search, Link2 } from 'lucide-react'

export function OverviewDemo() {
  const [phase, setPhase] = useState<'loading'|'loaded'>('loading')
  const [score, setScore] = useState(0)

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []
    function t(fn: () => void, ms: number) { timeouts.push(setTimeout(fn, ms)) }

    function runSequence() {
      t(() => setPhase('loading'), 0)
      t(() => setScore(0), 0)
      
      t(() => setPhase('loaded'), 800)
      
      // Animate score from 0 to 80
      let start = 0
      const end = 80
      const duration = 1200
      const steps = 40
      const stepTime = duration / steps
      const increment = end / steps
      
      for (let i = 0; i <= steps; i++) {
        t(() => setScore(Math.min(Math.round(start + (increment * i)), end)), 800 + (i * stepTime))
      }

      t(() => runSequence(), 7000)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1E293B] rounded-[32px] shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden border-[6px] border-white dark:border-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif', height: 500 }}>
      
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Dashboard</h3>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Overview</h2>
      </div>

      <div className="p-5 overflow-y-auto" style={{ height: 'calc(100% - 76px)' }}>
        
        {/* SEO Score Card */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-4 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">SEO Score</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white leading-none">{score}</span>
            <span className="text-sm font-semibold text-slate-400 pb-1">/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 w-fit px-2 py-1 rounded-md">
            <TrendingUp className="w-3 h-3" />
            Based on latest audit
          </div>
        </div>

        {/* Mini stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition-opacity duration-500" style={{ opacity: phase === 'loading' ? 0 : 1 }}>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Keywords</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">124</div>
            <div className="text-[10px] font-semibold text-blue-500 mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> +12 this week</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition-opacity duration-500" style={{ opacity: phase === 'loading' ? 0 : 1, transitionDelay: '200ms' }}>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Backlinks</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">24</div>
            <div className="text-[10px] font-semibold text-purple-500 mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> +3 new</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-3">Recent Activity</h4>
          <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
            
            {[
              { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, title: 'Backlink Scan Completed', time: 'Just now', delay: 400 },
              { icon: <Activity className="w-3.5 h-3.5 text-blue-500" />, title: 'SEO Audit Run', time: '2 hours ago', delay: 600 },
              { icon: <Search className="w-3.5 h-3.5 text-purple-500" />, title: 'Keyword Research', time: 'Yesterday', delay: 800 },
            ].map((item, i) => (
              <div 
                key={i} 
                className="relative pl-7 flex flex-col transition-all duration-500"
                style={{ 
                  opacity: phase === 'loading' ? 0 : 1, 
                  transform: phase === 'loading' ? 'translateY(10px)' : 'translateY(0)',
                  transitionDelay: `${item.delay}ms` 
                }}
              >
                <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center z-10">
                  {item.icon}
                </div>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                <span className="text-[11px] text-slate-400 font-medium">{item.time}</span>
              </div>
            ))}
            
          </div>
        </div>

      </div>
    </div>
  )
}
