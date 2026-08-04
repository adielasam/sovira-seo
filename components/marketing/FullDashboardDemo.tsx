'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { 
  Shield, Search, Activity, Users, FileText, TrendingUp, Link2, 
  Settings, LogOut, Bell, Moon, ChevronDown, Plus, Globe, 
  Sparkles, CheckCircle2, ArrowUpRight, ArrowUp, BarChart2, X
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
  
  const [activeTab, setActiveTab] = useState<string>('home')
  const [cursor, setCursor] = useState({ x: 500, y: 300 })
  const [clicking, setClicking] = useState(false)
  
  // States for individual panels
  const [homeScore, setHomeScore] = useState(0)
  const [analyserPhase, setAnalyserPhase] = useState<'upload'|'table'|'theme'>('upload')
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
        setAnalyserPhase('upload')
        setKeywordTyped('')
        setCompTyped('')
        setContentTyped('')
        setCursor({ x: 500, y: 300 })
      }, 0)
      
      // Animate Home Score
      for (let i = 0; i <= 20; i++) {
        t(() => setHomeScore(Math.round(80 * (i/20))), 500 + i * 50)
      }

      // 2. DATA ANALYSER SEQUENCE (4s - 13s)
      t(() => click(80, 140, () => setActiveTab('analyser')), 3500)
      t(() => setCursor({ x: 450, y: 350 }), 4500)
      t(() => click(450, 350, () => setAnalyserPhase('table')), 5500) // Click upload
      t(() => click(850, 100, () => setAnalyserPhase('theme')), 8500) // Click Next
      t(() => click(900, 300), 10500) // Click theme on sidebar
      t(() => setCursor({ x: 500, y: 350 }), 11500) // Move cursor out

      // 3. KEYWORDS SEQUENCE (14s - 20s)
      t(() => click(80, 275, () => setActiveTab('keywords')), 13500)
      t(() => click(400, 160), 14500) // Click search bar
      t(() => setKeywordPhase('typing'), 15400)
      const kw = 'content marketing nigeria'
      kw.split('').forEach((ch, i) => t(() => setKeywordTyped(prev => prev + ch), 15500 + i * 40))
      t(() => click(830, 160, () => setKeywordPhase('searching')), 15500 + kw.length*40 + 400)
      t(() => setKeywordPhase('results'), 15500 + kw.length*40 + 1500)
      t(() => setCursor({ x: 500, y: 350 }), 15500 + kw.length*40 + 2000)

      // 4. CONTENT AI SEQUENCE (21s - 28s)
      t(() => click(80, 365, () => setActiveTab('content')), 20500)
      t(() => click(300, 210), 21500) // Click input
      t(() => setContentPhase('typing'), 22400)
      const topic = 'Best SEO practices 2026'
      topic.split('').forEach((ch, i) => t(() => setContentTyped(prev => prev + ch), 22500 + i * 40))
      t(() => click(300, 480, () => setContentPhase('generating')), 22500 + topic.length*40 + 400) // Click generate
      t(() => setContentPhase('done'), 22500 + topic.length*40 + 3000)
      t(() => setCursor({ x: 700, y: 400 }), 22500 + topic.length*40 + 3500)

      // LOOP
      t(() => runSequence(), 29000)
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
            <Image
              src="/sovira-logo.png"
              alt="Sovira SEO"
              width={110}
              height={30}
              className="h-7 w-auto object-contain brightness-0 invert"
            />
          </div>
          
          <div className="flex-1 py-4 px-3 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-2">AI Search</div>
            {[
              { id: 'home', icon: Activity, label: 'Dashboard' },
              { id: 'analyser', icon: BarChart2, label: 'Data Analyser' },
              { id: 'audit', icon: Search, label: 'Site Audit' },
              { id: 'rank', icon: TrendingUp, label: 'Rank Tracker' },
              { id: 'keywords', icon: FileText, label: 'Keywords' },
              { id: 'backlinks', icon: Link2, label: 'Backlinks' },
              { id: 'content', icon: Sparkles, label: 'Content AI' },
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'home' && 'Dashboard Overview'}
              {activeTab === 'keywords' && 'Keyword Research'}
              {activeTab === 'analyser' && 'Data Analyser'}
              {activeTab === 'content' && 'Content AI Generator'}
            </h2>
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

                        {/* --- ANALYSER VIEW --- */}
            {activeTab === 'analyser' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                {analyserPhase === 'upload' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-16 text-center max-w-2xl w-full bg-white dark:bg-[#1E293B]">
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Activity className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload your dataset</h3>
                      <p className="text-slate-500 mb-8">Supports CSV, Excel, TXT up to 10MB</p>
                      <button className="px-8 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors">
                        <ArrowUp className="w-4 h-4" /> Select File
                      </button>
                    </div>
                  </div>
                )}
                {analyserPhase === 'table' && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Cleansed & Structured</h2>
                        <p className="text-slate-500 italic">Our AI has automatically formatted and mapped your raw data.</p>
                      </div>
                      <button className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#4338CA] transition-colors">
                        Next: Choose Dashboard Style
                      </button>
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-4 font-semibold">Row Labels</th>
                            <th className="p-4 font-semibold">Sum of Sales</th>
                            <th className="p-4 font-semibold">Row Labels 1</th>
                            <th className="p-4 font-semibold">Sum of Sales 1</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr><td className="p-4 text-slate-900 dark:text-white">South</td><td className="p-4 text-slate-600 dark:text-slate-300">595566.27</td><td className="p-4 text-slate-900 dark:text-white">Apparel</td><td className="p-4 text-slate-600 dark:text-slate-300">854616.61</td></tr>
                          <tr><td className="p-4 text-slate-900 dark:text-white">North</td><td className="p-4 text-slate-600 dark:text-slate-300">661211.95</td><td className="p-4 text-slate-900 dark:text-white">Electronics</td><td className="p-4 text-slate-600 dark:text-slate-300">915701.93</td></tr>
                          <tr><td className="p-4 text-slate-900 dark:text-white">West</td><td className="p-4 text-slate-600 dark:text-slate-300">662344.00</td><td className="p-4 text-slate-900 dark:text-white">Home Goods</td><td className="p-4 text-slate-600 dark:text-slate-300">812167.99</td></tr>
                          <tr><td className="p-4 font-bold text-slate-900 dark:text-white">Grand Total</td><td className="p-4 font-bold text-slate-900 dark:text-white">2582486.54</td><td className="p-4 font-bold text-slate-900 dark:text-white">Grand Total</td><td className="p-4 font-bold text-slate-900 dark:text-white">2582486.54</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {analyserPhase === 'theme' && (
                  <div className="flex-1 flex gap-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Style Preview</h2>
                      <p className="text-slate-500 mb-6">Select a theme from the list to instantly apply it.</p>
                      <div className="w-full h-[400px] bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 overflow-hidden relative shadow-inner">
                        <div className="flex gap-4">
                           <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                             <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Annual Performance</div>
                             <div className="text-3xl font-serif text-slate-900 dark:text-white font-bold">How did our</div>
                             <div className="text-3xl font-serif text-slate-900 dark:text-white font-bold mb-2">$5.16M in sales...</div>
                             <div className="text-sm italic text-slate-500">The total sum of sales is $5.16M, with the top region being SOUTH.</div>
                           </div>
                           <div className="w-32 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                             <div className="text-[10px] text-slate-400 uppercase mb-2">Total Sum</div>
                             <div className="text-2xl font-serif text-slate-900 dark:text-white">$5.16M</div>
                           </div>
                        </div>
                        <div className="flex-1 flex gap-4">
                           <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-end p-4 gap-2">
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-1/2"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-3/4"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-1/4"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-full"></div>
                           </div>
                           <div className="w-48 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                             <div className="w-24 h-24 rounded-full border-[8px] border-slate-800 dark:border-slate-200 border-r-slate-200 dark:border-r-slate-700"></div>
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-72 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 h-fit">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Dashboard Themes</h3>
                      <p className="text-xs text-slate-500 mb-4">AI Suggestions</p>
                      <div className="space-y-4">
                        <div className="p-4 border-2 border-[#4F46E5] rounded-xl bg-[#4F46E5]/5 cursor-pointer relative">
                          <div className="flex gap-1 mb-3">
                            <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">Oreate Editorial</div>
                          <div className="text-xs text-slate-500 mt-1">Premium, journalistic layout with muted tones.</div>
                          <div className="absolute top-4 right-4 text-[#4F46E5]"><CheckCircle2 className="w-5 h-5"/></div>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-300">
                          <div className="flex gap-1 mb-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">Vibrant Modern</div>
                          <div className="text-xs text-slate-500 mt-1">Energetic startup aesthetic with pastel cards.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )

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
          
          {/* Sovira Agent Chat Widget overlay */}
          <div className="absolute bottom-6 right-6 w-80 bg-white dark:bg-[#1E293B] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col z-40">
            <div className="bg-[#007AFF] text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                Sovira Agent
              </div>
              <div className="flex items-center gap-2 opacity-80">
                <ArrowUpRight className="w-4 h-4" />
                <Settings className="w-4 h-4" />
                <X className="w-4 h-4" />
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto text-xs bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4">
              <p className="text-slate-500 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm text-[11px]">
                By joining this chat, you confirm that you agree to and understand our <span className="text-blue-500">Privacy Policy</span> and <span className="text-blue-500">Terms of Service</span>.
                Please note that this AI-powered assistant may occasionally provide inaccurate information.
              </p>
              
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-1">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200">
                  This is Sovira Agent! How can I assist you today?
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-3 py-2 border border-slate-200 dark:border-slate-700">
                <Search className="w-4 h-4 text-slate-400" /> {/* Mic icon representation */}
                <input type="text" placeholder="Type your message..." className="bg-transparent flex-1 outline-none text-xs text-slate-700 dark:text-slate-300 min-w-0" disabled />
                <ArrowUp className="w-4 h-4 text-slate-400" />
              </div>
            </div>
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
