'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Shield, Search, Activity, Users, FileText, TrendingUp, Link2, 
  Settings, LogOut, Bell, Moon, ChevronDown, Plus, Globe, 
  Sparkles, CheckCircle2, ArrowUpRight, ArrowUp, BarChart2
} from 'lucide-react'

// --- Custom Hooks ---
function useResponsiveScale(width: number) {
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth
        // Add some padding
        const availableWidth = parentWidth - 32
        setScale(Math.min(1, availableWidth / width))
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [width])

  return { containerRef, scale }
}

function Cursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, zIndex: 9999, pointerEvents: 'none',
        transition: 'left 0.7s cubic-bezier(0.25,0.46,0.45,0.94), top 0.7s cubic-bezier(0.25,0.46,0.45,0.94)',
        transform: 'translate(-4px,-4px)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 2L18 10L11 12.5L8 19L4 2Z" fill="white" stroke="#1E293B" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {clicking && (
        <div style={{ position: 'absolute', top: -10, left: -10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.3)', animation: 'cursorClick 0.4s ease-out both' }} />
      )}
    </div>
  )
}

// --- Main Component ---
export function FullDashboardDemo() {
  const { containerRef, scale } = useResponsiveScale(1024)
  
  const [activeTab, setActiveTab] = useState<'home'|'keywords'|'competitors'|'content'>('home')
  const [cursor, setCursor] = useState({ x: 500, y: 300 })
  const [clicking, setClicking] = useState(false)
  
  // States for individual panels
  const [homeScore, setHomeScore] = useState(0)
  const [keywordPhase, setKeywordPhase] = useState<'idle'|'typing'|'searching'|'results'>('idle')
  const [keywordTyped, setKeywordTyped] = useState('')
  const [compPhase, setCompPhase] = useState<'idle'|'typing'|'analyzing'|'results'|'modal'>('idle')
  const [compTyped, setCompTyped] = useState('')
  const [contentPhase, setContentPhase] = useState<'idle'|'typing'|'generating'|'done'>('idle')
  const [contentTyped, setContentTyped] = useState('')

  function click(x: number, y: number, cb?: () => void) {
    setCursor({ x, y })
    setTimeout(() => {
      setClicking(true)
      setTimeout(() => { setClicking(false); cb?.() }, 200)
    }, 700)
  }

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []
    function t(fn: () => void, ms: number) { timeouts.push(setTimeout(fn, ms)) }

    function runSequence() {
      // 1. HOME SEQUENCE (0 - 4s)
      t(() => {
        setActiveTab('home')
        setHomeScore(0)
        setKeywordPhase('idle')
        setCompPhase('idle')
        setContentPhase('idle')
        setKeywordTyped('')
        setCompTyped('')
        setContentTyped('')
        setCursor({ x: 500, y: 300 })
      }, 0)
      
      // Animate Home Score
      for (let i = 0; i <= 20; i++) {
        t(() => setHomeScore(Math.round(80 * (i/20))), 500 + i * 50)
      }

      // 2. KEYWORDS SEQUENCE (4s - 9s)
      t(() => click(80, 240, () => setActiveTab('keywords')), 3500)
      t(() => click(400, 160), 4500) // Click search bar
      t(() => setKeywordPhase('typing'), 5400)
      const kw = 'content marketing nigeria'
      kw.split('').forEach((ch, i) => t(() => setKeywordTyped(prev => prev + ch), 5500 + i * 40))
      t(() => click(830, 160, () => setKeywordPhase('searching')), 5500 + kw.length*40 + 400)
      t(() => setKeywordPhase('results'), 5500 + kw.length*40 + 1500)
      t(() => setCursor({ x: 500, y: 350 }), 5500 + kw.length*40 + 2000) // Move cursor out of way

      // 3. COMPETITORS SEQUENCE (10s - 16s)
      t(() => click(80, 290, () => setActiveTab('competitors')), 10000)
      t(() => click(400, 190), 11000) // Click input
      t(() => setCompPhase('typing'), 11900)
      const domain = 'competitor.com'
      domain.split('').forEach((ch, i) => t(() => setCompTyped(prev => prev + ch), 12000 + i * 50))
      t(() => click(900, 190, () => setCompPhase('analyzing')), 12000 + domain.length*50 + 400)
      t(() => setCompPhase('results'), 12000 + domain.length*50 + 1500)
      t(() => setCompPhase('modal'), 12000 + domain.length*50 + 2200)

      // 4. CONTENT AI SEQUENCE (17s - 24s)
      t(() => click(80, 340, () => setActiveTab('content')), 17000)
      t(() => click(300, 210), 18000) // Click input
      t(() => setContentPhase('typing'), 18900)
      const topic = 'Best SEO practices 2026'
      topic.split('').forEach((ch, i) => t(() => setContentTyped(prev => prev + ch), 19000 + i * 40))
      t(() => click(300, 480, () => setContentPhase('generating')), 19000 + topic.length*40 + 400) // Click generate
      t(() => setContentPhase('done'), 19000 + topic.length*40 + 3000)
      t(() => setCursor({ x: 700, y: 400 }), 19000 + topic.length*40 + 3500)

      // LOOP
      t(() => runSequence(), 26000)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div ref={containerRef} className="w-full flex justify-center my-12 overflow-hidden relative" style={{ height: scale * 640 }}>
      <div 
        className="absolute top-0 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 bg-slate-50 dark:bg-slate-900 flex"
        style={{ width: 1024, height: 640, transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        
        {/* SIDEBAR (Dark Theme Always) */}
        <div className="w-[240px] bg-[#0A101F] flex flex-col shrink-0 text-slate-300">
          <div className="h-16 flex items-center px-6 gap-3 border-b border-white/5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Shield className="w-5 h-5" /></div>
            <span className="font-bold text-white text-lg tracking-tight">Sovira SEO</span>
          </div>
          
          <div className="flex-1 py-4 px-3 space-y-1">
            {[
              { id: 'home', icon: Activity, label: 'Home' },
              { id: 'audit', icon: BarChart2, label: 'SEO Audit' },
              { id: 'keywords', icon: Search, label: 'Keywords' },
              { id: 'competitors', icon: Users, label: 'Competitors' },
              { id: 'content', icon: Sparkles, label: 'Content AI' },
              { id: 'rank', icon: TrendingUp, label: 'Rank Tracker' },
              { id: 'backlinks', icon: Link2, label: 'Backlinks' },
              { id: 'reports', icon: FileText, label: 'Reports' },
            ].map(item => (
              <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}>
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/5 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5"><Settings className="w-4 h-4 text-slate-400" /> Settings</div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5"><LogOut className="w-4 h-4 text-slate-400" /> Log out</div>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0F172A]">
          {/* Header */}
          <div className="h-16 bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'home' && 'Dashboard Overview'}
              {activeTab === 'keywords' && 'Keyword Research'}
              {activeTab === 'competitors' && 'Competitor Analysis'}
              {activeTab === 'content' && 'Content AI Generator'}
            </h1>
            <div className="flex items-center gap-4">
              <Moon className="w-5 h-5 text-slate-400" />
              <Bell className="w-5 h-5 text-slate-400" />
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">CN</div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Chisom N.</span>
              </div>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            
            {/* --- HOME VIEW --- */}
            {activeTab === 'home' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-sm text-slate-500 mb-2">SEO Score</div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white flex items-end gap-1">
                      {homeScore} <span className="text-lg text-slate-400 font-medium mb-1">/100</span>
                    </div>
                    <div className="mt-3 text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/20 w-fit px-2 py-1 rounded-md flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Based on latest audit
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-sm text-slate-500 mb-2">Keywords Tracked</div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">124</div>
                    <div className="mt-3 text-xs text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/20 w-fit px-2 py-1 rounded-md flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> +12 this week
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-sm text-slate-500 mb-2">Backlinks</div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">24</div>
                    <div className="mt-3 text-xs text-purple-500 font-semibold bg-purple-50 dark:bg-purple-900/20 w-fit px-2 py-1 rounded-md flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> +3 new
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-sm text-slate-500 mb-2">Est. Traffic</div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">14.2k</div>
                    <div className="mt-3 text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/20 w-fit px-2 py-1 rounded-md flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> +18% MoM
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-2">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {[
                        { icon: Activity, title: 'Backlink Scan Completed', time: 'Just now', color: 'text-blue-500' },
                        { icon: BarChart2, title: 'Audit Run', time: '2 hours ago', color: 'text-purple-500' },
                        { icon: Search, title: 'Keyword Research', time: 'Yesterday', color: 'text-emerald-500' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800/50">
                          <div className={`w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{item.title}</div>
                            <div className="text-sm text-slate-500">{item.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- KEYWORDS VIEW --- */}
            {activeTab === 'keywords' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 flex items-center gap-3 bg-white dark:bg-[#1E293B] rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Search className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-200 text-base">
                      {keywordTyped || <span className="text-slate-400">Enter a seed keyword...</span>}
                      {keywordPhase === 'typing' && <span className="inline-block w-[2px] h-4 bg-blue-600 ml-1 animate-pulse" />}
                    </span>
                  </div>
                  <button className="bg-blue-600 text-white px-8 rounded-xl font-bold flex items-center justify-center w-32">
                    {keywordPhase === 'searching' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Search'}
                  </button>
                </div>

                {keywordPhase === 'results' && (
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                        <tr><th className="p-4 font-semibold">Keyword</th><th className="p-4 font-semibold">Volume</th><th className="p-4 font-semibold">Difficulty</th><th className="p-4 font-semibold">Trend</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[
                          { kw: 'content marketing nigeria', vol: '8.1k', diff: 32, trend: 'up' },
                          { kw: 'digital marketing lagos', vol: '5.4k', diff: 41, trend: 'up' },
                          { kw: 'SEO agency abuja', vol: '2.9k', diff: 28, trend: 'up' },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="p-4 font-medium text-slate-900 dark:text-white">{row.kw}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-300">{row.vol}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.diff < 35 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {row.diff}/100
                              </span>
                            </td>
                            <td className="p-4"><ArrowUpRight className="w-4 h-4 text-emerald-500" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* --- COMPETITORS VIEW --- */}
            {activeTab === 'competitors' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Step 2: Add Competitors</h3>
                  <div className="flex gap-4">
                    <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                      <Search className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-200">
                        {compTyped || <span className="text-slate-400">Enter competitor URL...</span>}
                        {compPhase === 'typing' && <span className="inline-block w-[2px] h-4 bg-blue-600 ml-1 animate-pulse" />}
                      </span>
                    </div>
                    <button className="bg-blue-600 text-white px-8 rounded-xl font-bold flex items-center justify-center w-40 gap-2">
                      {compPhase === 'analyzing' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4"/> Analyze</>}
                    </button>
                  </div>
                </div>

                {compPhase === 'results' || compPhase === 'modal' ? (
                  <div className="relative">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Domain Comparison</h3>
                    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                          <tr><th className="p-4 font-semibold">Metric</th><th className="p-4 font-semibold text-emerald-600">Your Site</th><th className="p-4 font-semibold text-blue-600">{compTyped}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr><td className="p-4 font-medium text-slate-900 dark:text-white">Domain Authority</td><td className="p-4">32</td><td className="p-4 font-bold">84</td></tr>
                          <tr><td className="p-4 font-medium text-slate-900 dark:text-white">Backlinks</td><td className="p-4">15k</td><td className="p-4 font-bold">1.2M</td></tr>
                          <tr className={compPhase === 'modal' ? 'blur-sm opacity-50' : ''}><td className="p-4 font-medium text-slate-900 dark:text-white">Organic Traffic</td><td className="p-4">8.4k</td><td className="p-4 font-bold">450k</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {compPhase === 'modal' && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 text-center max-w-sm">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-6 h-6" />
                          </div>
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unlock Deep Insights</h4>
                          <p className="text-slate-500 dark:text-slate-400 mb-6">Upgrade to a premium plan to reveal full competitor data, keyword gaps, and automated exports.</p>
                          <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-500 transition-colors">
                            Upgrade to Pro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* --- CONTENT AI VIEW --- */}
            {activeTab === 'content' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-8 h-full">
                <div className="w-[320px] shrink-0 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Topic or Keyword</label>
                    <div className="bg-white dark:bg-[#1E293B] rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-slate-700 dark:text-slate-200">
                        {contentTyped || <span className="text-slate-400">e.g. Best SEO practices...</span>}
                        {contentPhase === 'typing' && <span className="inline-block w-[2px] h-4 bg-blue-600 ml-1 animate-pulse" />}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Content Type</label>
                    <div className="bg-white dark:bg-[#1E293B] rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between">
                      Blog Post <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tone of Voice</label>
                    <div className="bg-white dark:bg-[#1E293B] rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between">
                      Professional <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2">
                    {contentPhase === 'generating' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles className="w-5 h-5" /> Generate Content</>}
                  </button>
                </div>

                <div className="flex-1 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <FileText className="w-4 h-4" /> Content Drafting
                  </div>
                  <div className="flex-1 p-6 relative">
                    {contentPhase === 'idle' || contentPhase === 'typing' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <Sparkles className="w-8 h-8 mb-3 opacity-50" />
                        <p>Fill out the form on the left to generate content.</p>
                      </div>
                    ) : contentPhase === 'generating' ? (
                      <div className="space-y-4 max-w-2xl">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-[85%] animate-pulse" />
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full animate-pulse delay-75" />
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-[90%] animate-pulse delay-150" />
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-[60%] animate-pulse delay-300" />
                      </div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-2xl animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-2xl font-bold mb-4">The Future of SEO in 2026</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">As search algorithms continue to evolve, the distinction between high-quality content and generic AI generation has never been more critical. To rank in 2026, focus heavily on intent, deep entity understanding, and creating highly localized experiences for your users.</p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Search engines are now optimizing for direct answers. If your content doesn't immediately solve the user's query within the first paragraph...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>

      <Cursor x={cursor.x} y={cursor.y} clicking={clicking} />

      <style>{`
        @keyframes cursorClick { 0%{transform:scale(0.5);opacity:1} 100%{transform:scale(1.5);opacity:0} }
      `}</style>
    </div>
  )
}
