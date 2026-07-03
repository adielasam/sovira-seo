'use client'

import { useState, useEffect } from 'react'
import { Plus, Lock, Globe } from 'lucide-react'

function Cursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, zIndex: 50, pointerEvents: 'none',
        transition: 'left 0.6s cubic-bezier(0.25,0.46,0.45,0.94), top 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
        transform: 'translate(-4px,-4px)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 2L17 10L10 12L7 18L3 2Z" fill="white" stroke="#1E293B" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {clicking && (
        <div style={{ position: 'absolute', top: -8, left: -8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(37,99,235,0.25)', animation: 'cursorClick 0.4s ease-out both' }} />
      )}
    </div>
  )
}

const DEMO_URL = 'competitor.com'

export function CompetitorsDemo() {
  const [phase, setPhase] = useState<'idle'|'typing'|'analyzing'|'results'|'modal'>('idle')
  const [typed, setTyped] = useState('')
  const [cursor, setCursor] = useState({ x: 30, y: 350 })
  const [clicking, setClicking] = useState(false)

  function click(x: number, y: number, cb?: () => void) {
    setCursor({ x, y })
    setTimeout(() => {
      setClicking(true)
      setTimeout(() => { setClicking(false); cb?.() }, 300)
    }, 650)
  }

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []
    function t(fn: () => void, ms: number) { timeouts.push(setTimeout(fn, ms)) }

    function runSequence() {
      t(() => { setPhase('idle'); setTyped('') }, 0)
      
      // Cursor to input
      t(() => setCursor({ x: 120, y: 155 }), 500)
      t(() => click(120, 155), 1000)

      // Typing
      t(() => setPhase('typing'), 1500)
      DEMO_URL.split('').forEach((ch, i) => {
        t(() => setTyped(prev => prev + ch), 1600 + i * 60)
      })

      // Click Analyze
      const afterType = 1600 + DEMO_URL.length * 60
      t(() => setCursor({ x: 290, y: 155 }), afterType + 200)
      t(() => click(290, 155, () => setPhase('analyzing')), afterType + 600)

      // Loading -> Results
      t(() => setPhase('results'), afterType + 2000)

      // Pop Modal
      t(() => setPhase('modal'), afterType + 2800)

      // Restart
      t(() => runSequence(), afterType + 6000)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1E293B] rounded-[32px] shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden border-[6px] border-white dark:border-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif', height: 500 }}>
      
      <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Competitors</h3>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Domain Analysis</h2>
      </div>

      <div className="p-5">
        
        {/* Form */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Target Domain</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 overflow-hidden">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                {typed || <span className="text-slate-400">e.g. competitor.com</span>}
                {phase === 'typing' && (
                  <span style={{ display: 'inline-block', width: 2, height: 14, background: '#2563EB', marginLeft: 1, animation: 'blink 0.8s step-end infinite', verticalAlign: 'middle' }} />
                )}
              </span>
            </div>
            <button className="flex items-center justify-center w-10 bg-[#2563EB] text-white rounded-xl flex-shrink-0 shadow-md">
              {phase === 'analyzing'
                ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Plus className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="relative">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Domain Comparison</h4>
          
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800/50 p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              <div>Metric</div>
              <div className="text-right truncate">{typed || '—'}</div>
            </div>

            {/* Table Body */}
            {phase === 'idle' || phase === 'typing' || phase === 'analyzing' ? (
              <div className="p-4 flex flex-col gap-3">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-full animate-pulse" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-5/6 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="grid grid-cols-2 p-3 border-b border-slate-50 dark:border-slate-800/50 items-center">
                  <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Domain Authority</span>
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white text-right">84</span>
                </div>
                <div className="grid grid-cols-2 p-3 border-b border-slate-50 dark:border-slate-800/50 items-center">
                  <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Backlinks</span>
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white text-right">1.2M</span>
                </div>
                <div className="grid grid-cols-2 p-3 items-center opacity-40 blur-[2px]">
                  <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Organic Traffic</span>
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white text-right">450k</span>
                </div>
              </div>
            )}
          </div>

          {/* Premium Modal Popup */}
          {phase === 'modal' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-xl" style={{ animation: 'modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 text-center mx-2 max-w-[240px]">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1.5">Unlock Deep Insights</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Upgrade to a premium plan to reveal full data, keyword gaps, and exports.
                </p>
                <button className="w-full bg-[#2563EB] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm">
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <Cursor x={cursor.x} y={cursor.y} clicking={clicking} />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes cursorClick { 0%{transform:scale(0);opacity:1} 100%{transform:scale(2.5);opacity:0} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  )
}
