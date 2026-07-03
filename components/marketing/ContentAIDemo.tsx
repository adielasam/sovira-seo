'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react'

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

const DEMO_TOPIC = 'Best SEO practices 2026'

export function ContentAIDemo() {
  const [phase, setPhase] = useState<'idle'|'typing'|'generating'|'done'>('idle')
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
      t(() => setCursor({ x: 100, y: 130 }), 500)
      t(() => click(100, 130), 1000)

      // Typing
      t(() => setPhase('typing'), 1500)
      DEMO_TOPIC.split('').forEach((ch, i) => {
        t(() => setTyped(prev => prev + ch), 1600 + i * 50)
      })

      // Click Generate
      const afterType = 1600 + DEMO_TOPIC.length * 50
      t(() => setCursor({ x: 170, y: 340 }), afterType + 400)
      t(() => click(170, 340, () => setPhase('generating')), afterType + 1000)

      // Done
      t(() => setPhase('done'), afterType + 3500)

      // Restart
      t(() => runSequence(), afterType + 8000)
    }

    runSequence()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1E293B] rounded-[32px] shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden border-[6px] border-white dark:border-slate-900 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif', height: 500 }}>
      
      <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Content AI</h3>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Generator</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-8 relative">
        
        {/* Form */}
        <div className="space-y-4 mb-6 transition-all duration-300" style={{ opacity: phase === 'done' ? 0.3 : 1 }}>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Topic</label>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
              <span className="text-[13px] text-slate-700 dark:text-slate-200">
                {typed || <span className="text-slate-400">e.g. {DEMO_TOPIC}</span>}
                {phase === 'typing' && (
                  <span style={{ display: 'inline-block', width: 2, height: 14, background: '#2563EB', marginLeft: 1, animation: 'blink 0.8s step-end infinite', verticalAlign: 'middle' }} />
                )}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                Blog Post
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tone</label>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                Professional
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          <button className="w-full mt-2 bg-[#2563EB] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2">
            {phase === 'generating' ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate
              </>
            )}
          </button>
        </div>

        {/* Output Area */}
        <div className="relative">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center justify-between">
            Draft
            {phase === 'done' && <span className="text-emerald-500 flex items-center gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3"/> Saved</span>}
          </h4>
          
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[160px] shadow-sm relative overflow-hidden">
            
            {phase === 'idle' || phase === 'typing' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 opacity-50">
                <Sparkles className="w-5 h-5 text-slate-400 mb-2" />
                <p className="text-[11px] text-slate-500 font-medium">Ready to write</p>
              </div>
            ) : phase === 'generating' ? (
              <div className="space-y-3">
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-[85%] animate-pulse" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full animate-pulse delay-75" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-[90%] animate-pulse delay-150" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-[60%] animate-pulse delay-300" />
              </div>
            ) : (
              <div className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <p className="font-bold text-slate-900 dark:text-white mb-2 text-[14px]">The Future of SEO in 2026</p>
                <p className="mb-2">As search algorithms continue to evolve, the distinction between high-quality content and generic AI generation has never been more critical. To rank in 2026, focus heavily on intent...</p>
                <div className="w-full h-10 absolute bottom-0 left-0 bg-gradient-to-t from-white dark:from-[#1E293B] to-transparent pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clicking={clicking} />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes cursorClick { 0%{transform:scale(0);opacity:1} 100%{transform:scale(2.5);opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
