'use client'

import { useState } from 'react'
import { LayoutDashboard, Search, FileText, Users, Check } from 'lucide-react'
import { DashboardDemo } from './DashboardDemo'
import { OverviewDemo } from './OverviewDemo'
import { CompetitorsDemo } from './CompetitorsDemo'
import { ContentAIDemo } from './ContentAIDemo'

const FEATURES = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    desc: 'See your complete SEO performance at a glance. Track rankings, traffic, and recent activity.',
    icon: LayoutDashboard,
    component: OverviewDemo,
    bullets: ['Unified metric tracking', 'Real-time activity feed']
  },
  {
    id: 'keywords',
    title: 'Keyword Research',
    desc: 'Discover high-value, low-competition keywords in seconds with AI intent analysis.',
    icon: Search,
    component: DashboardDemo,
    bullets: ['Search volume & difficulty', 'Trend analysis']
  },
  {
    id: 'competitors',
    title: 'Competitor Tracking',
    desc: 'Instantly compare your domain authority and backlink profile against top competitors.',
    icon: Users,
    component: CompetitorsDemo,
    bullets: ['Domain comparison', 'Backlink gap analysis']
  },
  {
    id: 'content',
    title: 'Content AI Generator',
    desc: 'Generate human-like, SEO-optimized blog posts and articles in seconds.',
    icon: FileText,
    component: ContentAIDemo,
    bullets: ['Custom tone & length', 'Bypass AI detectors']
  },
]

export function InteractiveShowcase() {
  const [activeId, setActiveId] = useState(FEATURES[0].id)

  const activeFeature = FEATURES.find(f => f.id === activeId)!
  const ActiveComponent = activeFeature.component

  return (
    <div className="bg-slate-50 dark:bg-[#0F172A] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            Everything you need to rank faster
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            From discovering untapped keywords to generating human-like content, Sovira replaces 5 different expensive tools with one powerful dashboard.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left: Tab Navigation */}
          <div className="lg:col-span-5 space-y-4">
            {FEATURES.map((feature) => {
              const isActive = activeId === feature.id
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveId(feature.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                    isActive 
                      ? 'border-[#2563EB] bg-white dark:bg-[#1E293B] shadow-lg scale-[1.02]' 
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-[#2563EB] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold mb-1 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {feature.title}
                      </h3>
                      <p className={`text-sm leading-relaxed mb-3 ${isActive ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 hidden md:block'}`}>
                        {feature.desc}
                      </p>
                      
                      {isActive && (
                        <ul className="space-y-2 mt-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                          {feature.bullets.map(bullet => (
                            <li key={bullet} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                              <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /></div>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right: Active Demo Widget */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <div 
              key={activeId} 
              className="w-full flex justify-center"
              style={{ animation: 'slideFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <ActiveComponent />
            </div>
          </div>

        </div>
      </div>
      <style>{`
        @keyframes slideFadeUp { from{opacity:0;transform:translateY(20px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
