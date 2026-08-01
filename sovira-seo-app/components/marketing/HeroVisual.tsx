'use client'

import Image from 'next/image'
import { TrendingUp, Eye, Radio, BarChart2, Link2 } from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Per-slide data ─────────────────────────────────────────────────────────
// Each slide has its own creator story + realistic SEO/content metrics
const SLIDES = [
  {
    img: { src: '/images/hero-creator.jpg', alt: 'Male content creator filming at his desk' },
    pill: '🎬 Content Published',
    rank:  { label: 'Keyword Rank', position: '#3', change: '+12 positions', sparkline: [30,45,38,60,55,72,90] },
    stat:  { label: 'Organic Traffic', value: '24.7k', delta: '↑ 38%', bars: [40,55,35,70,60,85,100] },
  },
  {
    img: { src: '/images/hero-creator-2.jpg', alt: 'Female content creator at her laptop' },
    pill: '✍️ Blog Post Live',
    rank:  { label: 'SEO Score', position: '92/100', change: '+18 pts this week', sparkline: [50,58,62,70,74,80,92] },
    stat:  { label: 'Views This Week', value: '11.2k', delta: '↑ 61%', bars: [20,35,28,50,44,68,88] },
  },
  {
    img: { src: '/images/hero-creator-3.jpg', alt: 'YouTuber at a dual monitor setup' },
    pill: '🔗 Backlinks Found',
    rank:  { label: 'Backlinks Added', position: '+47', change: '3 toxic removed', sparkline: [5,12,18,22,28,38,47] },
    stat:  { label: 'Domain Authority', value: 'DA 41', delta: '↑ 9 pts', bars: [30,32,35,36,38,40,41] },
  },
]

const SLIDE_INTERVAL = 4500

// Tiny sparkline drawn from an array of 0-100 values
function Sparkline({ values }: { values: number[] }) {
  const w = 64, h = 24
  const max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
      <polyline points={pts} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Fade wrapper: re-mounts children whenever `id` changes → triggers CSS fade-in
function FadeOnChange({ id, children }: { id: number; children: React.ReactNode }) {
  const [key, setKey] = useState(id)
  useEffect(() => { setKey(id) }, [id])
  return (
    <div key={key} style={{ animation: 'statFadeIn 0.45s ease-out both' }}>
      {children}
    </div>
  )
}

interface HeroVisualProps {
  /** Override image src for slide 0 */
  creatorImageSrc?: string
}

export function HeroVisual({ creatorImageSrc }: HeroVisualProps) {
  const [active, setActive] = useState(0)

  const slides = creatorImageSrc
    ? [{ ...SLIDES[0], img: { ...SLIDES[0].img, src: creatorImageSrc } }, ...SLIDES.slice(1)]
    : SLIDES

  useEffect(() => {
    const t = setInterval(() => setActive(c => (c + 1) % slides.length), SLIDE_INTERVAL)
    return () => clearInterval(t)
  }, [slides.length])

  const { pill, rank, stat } = slides[active]

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">

      {/* ── Photo container ── */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10"
        style={{ aspectRatio: '4/3' }}
      >
        {/* Crossfade slides — opacity only, no z-index switching */}
        {slides.map((s, i) => (
          <div
            key={s.img.src}
            style={{
              position: 'absolute', inset: 0,
              opacity: i === active ? 1 : 0,
              transition: 'opacity 800ms ease-in-out',
            }}
          >
            <Image
              src={s.img.src}
              alt={s.img.alt}
              fill
              className="object-cover object-center"
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ))}

        {/* Overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top right,rgba(15,23,42,0.28),transparent)', pointerEvents:'none', zIndex:10 }} />

        {/* ── Floating Card 1: Rank/SEO metric (top-left) ── */}
        <div style={{ position:'absolute', top:20, left:20, zIndex:20 }} className="hero-card-1">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl px-4 py-3 ring-1 ring-slate-200/60 dark:ring-slate-700/60" style={{ minWidth:156 }}>
            <FadeOnChange id={active}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{rank.label}</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{rank.position}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <Sparkline values={rank.sparkline} />
                  <span className="text-[11px] font-bold text-emerald-500 whitespace-nowrap">{rank.change}</span>
                </div>
              </div>
            </FadeOnChange>
          </div>
        </div>

        {/* ── Floating Card 2: Traffic/views stat (bottom-right) ── */}
        <div style={{ position:'absolute', bottom:20, right:20, zIndex:20 }} className="hero-card-2">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl px-4 py-3 ring-1 ring-slate-200/60 dark:ring-slate-700/60" style={{ minWidth:156 }}>
            <FadeOnChange id={active}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</span>
                <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{stat.value}</span>
                <span className="text-xs font-bold text-emerald-500">{stat.delta}</span>
              </div>
              {/* Mini bar chart */}
              <div className="flex items-end gap-1" style={{ height:18 }}>
                {stat.bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-[#2563EB]/20 dark:bg-[#2563EB]/30" style={{ height:`${h}%` }} />
                ))}
              </div>
            </FadeOnChange>
          </div>
        </div>

        {/* ── Pill: dynamic action label (top-right) ── */}
        <div style={{ position:'absolute', top:20, right:20, zIndex:20 }} className="hero-card-3">
          <FadeOnChange id={active}>
            <div className="bg-emerald-500 text-white rounded-full shadow-lg px-3.5 py-1.5 flex items-center gap-2">
              <Radio className="w-3 h-3 animate-pulse flex-shrink-0" />
              <span className="text-xs font-bold tracking-wide whitespace-nowrap">{pill}</span>
            </div>
          </FadeOnChange>
        </div>

        {/* ── Dot indicators ── */}
        <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', gap:6 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Creator ${i + 1}`}
              style={{
                height:8, width: i === active ? 24 : 8,
                borderRadius:9999,
                background: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
                border:'none', cursor:'pointer',
                transition:'all 300ms ease', padding:0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes heroCardIn {
          from { opacity:0; transform:translateY(14px) scale(0.94); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes heroCardFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-7px); }
        }
        @keyframes statFadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hero-card-1 { animation: heroCardIn .5s ease-out .3s both, heroCardFloat 4s ease-in-out .8s infinite; }
        .hero-card-2 { animation: heroCardIn .5s ease-out .55s both, heroCardFloat 5s ease-in-out 1s infinite; }
        .hero-card-3 { animation: heroCardIn .5s ease-out .8s both, heroCardFloat 3.5s ease-in-out 1.2s infinite; }
        @media (max-width:480px) { .hero-card-2 { display:none; } }
      `}</style>
    </div>
  )
}
