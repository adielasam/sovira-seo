'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ArrowUp, ArrowDown, Minus } from 'lucide-react'

const DEMO_KEYWORD = 'content marketing nigeria'

const DEMO_RESULTS = [
  { keyword: 'content marketing nigeria',   vol: '8.1k', diff: 32, trend: 'up' },
  { keyword: 'digital marketing lagos',      vol: '5.4k', diff: 41, trend: 'up' },
  { keyword: 'SEO agency abuja',             vol: '2.9k', diff: 28, trend: 'up' },
  { keyword: 'social media manager ghana',   vol: '1.6k', diff: 19, trend: 'same' },
  { keyword: 'youtube growth strategy',      vol: '4.2k', diff: 55, trend: 'down' },
]

function DiffBadge({ score }: { score: number }) {
  const color = score < 30 ? '#10B981' : score < 50 ? '#F59E0B' : '#EF4444'
  const label = score < 30 ? 'Easy' : score < 50 ? 'Medium' : 'Hard'
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color }}>
      <span style={{ width: 24, height: 4, borderRadius: 99, background: '#E2E8F0', display: 'inline-block', verticalAlign: 'middle' }}>
        <span style={{ display: 'block', height: '100%', width: `${score}%`, borderRadius: 99, background: color, transition: 'width 0.6s ease' }} />
      </span>
      {label}
    </span>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up')   return <ArrowUp className="w-3 h-3 text-emerald-500" />
  if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-400" />
  return <Minus className="w-3 h-3 text-slate-400" />
}

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

export function DashboardDemo() {
  const [phase, setPhase] = useState<'idle'|'typing'|'searching'|'results'|'highlight'>('idle')
  const [typed, setTyped]   = useState('')
  const [visibleRows, setVisibleRows] = useState(0)
  const [highlighted, setHighlighted] = useState(-1)
  const [cursor, setCursor] = useState({ x: 30, y: 50 })
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
      t(() => { setPhase('idle'); setTyped(''); setVisibleRows(0); setHighlighted(-1) }, 0)
      t(() => setCursor({ x: 120, y: 72 }), 500)
      t(() => click(120, 72), 1000)

      t(() => setPhase('typing'), 1500)
      DEMO_KEYWORD.split('').forEach((ch, i) => {
        t(() => setTyped(prev => prev + ch), 1600 + i * 70)
      })

      const afterType = 1600 + DEMO_KEYWORD.length * 70
      t(() => setCursor({ x: 280, y: 72 }), afterType + 200)
      t(() => click(280, 72, () => setPhase('searching')), afterType + 700)

      t(() => setPhase('results'), afterType + 1800)
      DEMO_RESULTS.forEach((_, i) => {
        t(() => setVisibleRows(i + 1), afterType + 1800 + i * 280)
      })

      const afterResults = afterType + 1800 + DEMO_RESULTS.length * 280
      t(() => setCursor({ x: 150, y: 155 }), afterResults + 400)
      t(() => setHighlighted(0), afterResults + 900)

      t(() => setCursor({ x: 150, y: 275 }), afterResults + 1800)
      t(() => setHighlighted(2), afterResults + 2300)

      t(() => runSequence(), afterResults + 4200)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1E293B] rounded-[32px] shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden border-[6px] border-white dark:border-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif', height: 500 }}>
      
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Keyword Tool</h3>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Find new topics</h2>
      </div>

      <div className="p-5">
        {/* Search bar */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[13px] text-slate-700 dark:text-slate-200 min-w-[2px] truncate">
              {typed}
              {phase === 'typing' && (
                <span style={{ display: 'inline-block', width: 2, height: 14, background: '#2563EB', marginLeft: 1, animation: 'blink 0.8s step-end infinite', verticalAlign: 'middle' }} />
              )}
            </span>
          </div>
          <button className="flex items-center justify-center w-10 bg-[#2563EB] text-white rounded-xl flex-shrink-0 shadow-md">
            {phase === 'searching'
              ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Search className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Results */}
        {phase === 'results' || phase === 'highlight' ? (
          <div className="flex flex-col gap-3">
            {DEMO_RESULTS.slice(0, visibleRows).map((row, i) => (
              <div
                key={row.keyword}
                className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all duration-300"
                style={{
                  background: highlighted === i ? 'rgba(37,99,235,0.08)' : 'transparent',
                  borderColor: highlighted === i ? 'rgba(37,99,235,0.2)' : undefined,
                  animation: 'rowIn 0.35s ease-out both',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-[13px] truncate pr-2">{row.keyword}</span>
                  <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-[13px]">
                    <TrendIcon trend={row.trend} />
                    {row.vol}
                  </span>
                </div>
                <DiffBadge score={row.diff} />
              </div>
            ))}
          </div>
        ) : phase === 'searching' ? (
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-slate-50 dark:bg-slate-800" style={{ animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 + i * 0.1 }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-[13px] text-slate-500 font-medium">Type a seed keyword to get started</p>
          </div>
        )}
      </div>

      <Cursor x={cursor.x} y={cursor.y} clicking={clicking} />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.9} }
        @keyframes rowIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cursorClick { 0%{transform:scale(0);opacity:1} 100%{transform:scale(2.5);opacity:0} }
      `}</style>
    </div>
  )
}
