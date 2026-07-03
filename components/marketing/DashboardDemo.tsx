'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp, BarChart2, Star, ArrowUp, ArrowDown, Minus } from 'lucide-react'

// ── Demo keyword results that "type in" and populate ──────────────────────
const DEMO_KEYWORD = 'content marketing nigeria'

const DEMO_RESULTS = [
  { keyword: 'content marketing nigeria',   vol: '8,100', diff: 32, trend: 'up',   intent: 'Informational' },
  { keyword: 'digital marketing lagos',      vol: '5,400', diff: 41, trend: 'up',   intent: 'Commercial'    },
  { keyword: 'SEO agency abuja',             vol: '2,900', diff: 28, trend: 'up',   intent: 'Transactional' },
  { keyword: 'social media manager ghana',   vol: '1,600', diff: 19, trend: 'same', intent: 'Informational' },
  { keyword: 'youtube growth strategy',      vol: '4,200', diff: 55, trend: 'down', intent: 'Informational' },
]

// Difficulty colour bands
function DiffBadge({ score }: { score: number }) {
  const color = score < 30 ? '#10B981' : score < 50 ? '#F59E0B' : '#EF4444'
  const label = score < 30 ? 'Easy' : score < 50 ? 'Medium' : 'Hard'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
      <span style={{ width: 32, height: 5, borderRadius: 99, background: '#E2E8F0', display: 'inline-block', verticalAlign: 'middle' }}>
        <span style={{ display: 'block', height: '100%', width: `${score}%`, borderRadius: 99, background: color, transition: 'width 0.6s ease' }} />
      </span>
      {label}
    </span>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up')   return <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
  if (trend === 'down') return <ArrowDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-slate-400" />
}

// ── Animated Cursor ────────────────────────────────────────────────────────
function Cursor({ x, y, clicking }: { x: number; y: number; clicking: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 50,
        pointerEvents: 'none',
        transition: 'left 0.6s cubic-bezier(0.25,0.46,0.45,0.94), top 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
        transform: 'translate(-4px,-4px)',
      }}
    >
      {/* Arrow cursor */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 2L17 10L10 12L7 18L3 2Z" fill="white" stroke="#1E293B" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {/* Click ripple */}
      {clicking && (
        <div
          style={{
            position: 'absolute', top: -8, left: -8,
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(37,99,235,0.25)',
            animation: 'cursorClick 0.4s ease-out both',
          }}
        />
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function DashboardDemo() {
  // Phases: idle → typing → searching → results → highlight → idle…
  const [phase, setPhase] = useState<'idle'|'typing'|'searching'|'results'|'highlight'>('idle')
  const [typed, setTyped]   = useState('')
  const [visibleRows, setVisibleRows] = useState(0)
  const [highlighted, setHighlighted] = useState(-1)
  const [cursor, setCursor] = useState({ x: 60, y: 52 })
  const [clicking, setClicking] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Helper: trigger a click flash
  function click(x: number, y: number, cb?: () => void) {
    setCursor({ x, y })
    setTimeout(() => {
      setClicking(true)
      setTimeout(() => { setClicking(false); cb?.() }, 300)
    }, 650)
  }

  // Main animation sequence — loops forever
  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []
    function t(fn: () => void, ms: number) { timeouts.push(setTimeout(fn, ms)) }

    function runSequence() {
      // 1. Cursor moves to search box
      t(() => { setPhase('idle'); setTyped(''); setVisibleRows(0); setHighlighted(-1) }, 0)
      t(() => setCursor({ x: 180, y: 52 }), 500)

      // 2. Click into input
      t(() => click(180, 52), 1000)

      // 3. Type keyword char by char
      t(() => setPhase('typing'), 1500)
      DEMO_KEYWORD.split('').forEach((ch, i) => {
        t(() => setTyped(prev => prev + ch), 1600 + i * 70)
      })

      // 4. Move to Search button + click
      const afterType = 1600 + DEMO_KEYWORD.length * 70
      t(() => setCursor({ x: 420, y: 52 }), afterType + 200)
      t(() => click(420, 52, () => setPhase('searching')), afterType + 700)

      // 5. Results appear row by row
      t(() => setPhase('results'), afterType + 1800)
      DEMO_RESULTS.forEach((_, i) => {
        t(() => setVisibleRows(i + 1), afterType + 1800 + i * 280)
      })

      // 6. Cursor highlights row 0 (best keyword)
      const afterResults = afterType + 1800 + DEMO_RESULTS.length * 280
      t(() => setCursor({ x: 200, y: 178 }), afterResults + 400)
      t(() => setHighlighted(0), afterResults + 900)

      // 7. Cursor drifts to row 2
      t(() => setCursor({ x: 200, y: 242 }), afterResults + 1800)
      t(() => setHighlighted(2), afterResults + 2300)

      // 8. Pause then restart
      t(() => runSequence(), afterResults + 4200)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ── Browser chrome bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-slate-400 dark:text-slate-500 font-mono">sovira-seo.vercel.app/keywords</span>
      </div>

      {/* ── App shell ── */}
      <div className="flex min-h-[420px]">

        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-44 bg-slate-900 dark:bg-[#0F172A] py-4 gap-1 flex-shrink-0">
          <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sovira SEO</div>
          {['Dashboard','SEO Audit','Keywords','Content AI','Rank Tracker','Backlinks'].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg mx-2 ${
                i === 2
                  ? 'bg-[#2563EB] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {item}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="flex-1 p-5 overflow-hidden relative">

          {/* Page title */}
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyword Research</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Discover high-value, low-competition keywords with AI</p>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700 dark:text-slate-200 min-w-[2px]">
                {typed}
                {phase === 'typing' && (
                  <span style={{ display: 'inline-block', width: 2, height: 14, background: '#2563EB', marginLeft: 1, animation: 'blink 0.8s step-end infinite', verticalAlign: 'middle' }} />
                )}
              </span>
            </div>
            <button className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-500 text-white text-sm font-semibold px-4 rounded-xl transition-colors">
              {phase === 'searching'
                ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <><Search className="w-3.5 h-3.5" /> Research</>
              }
            </button>
          </div>

          {/* Results table */}
          {phase === 'results' || phase === 'highlight' ? (
            <div className="overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                <span>Keyword</span>
                <span>Volume</span>
                <span>Difficulty</span>
                <span>Trend</span>
              </div>

              {DEMO_RESULTS.slice(0, visibleRows).map((row, i) => (
                <div
                  key={row.keyword}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 text-sm items-center border-b border-slate-50 dark:border-slate-700/50 transition-all duration-300"
                  style={{
                    background: highlighted === i
                      ? 'rgba(37,99,235,0.07)'
                      : 'transparent',
                    animation: 'rowIn 0.35s ease-out both',
                  }}
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate text-xs">{row.keyword}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{row.vol}</span>
                  <DiffBadge score={row.diff} />
                  <span className="flex items-center gap-1">
                    <TrendIcon trend={row.trend} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{row.intent}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : phase === 'searching' ? (
            <div className="flex flex-col gap-3 mt-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-8 rounded-lg bg-slate-100 dark:bg-slate-700" style={{ animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 + i * 0.1 }} />
              ))}
            </div>
          ) : null}

          {/* Animated cursor */}
          <Cursor x={cursor.x} y={cursor.y} clicking={clicking} />
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.9} }
        @keyframes rowIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cursorClick { 0%{transform:scale(0);opacity:1} 100%{transform:scale(2.5);opacity:0} }
      `}</style>
    </div>
  )
}
