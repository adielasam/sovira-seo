'use client'

import Image from 'next/image'
import { TrendingUp, Eye, Radio } from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Image Slideshow ────────────────────────────────────────────────────────
// Add/remove entries here to change the carousel.
// Each entry accepts any path under /public.
const CREATOR_IMAGES = [
  { src: '/images/hero-creator.jpg',   alt: 'African male content creator filming at his desk with a ring light' },
  { src: '/images/hero-creator-2.jpg', alt: 'African female content creator smiling at her laptop in a bright workspace' },
  { src: '/images/hero-creator-3.jpg', alt: 'African male YouTuber at a dual monitor setup with ambient LED lighting' },
]

const SLIDE_INTERVAL = 4000 // ms per slide

// Mini sparkline path — purely decorative SVG
function Sparkline() {
  return (
    <svg viewBox="0 0 64 24" className="w-16 h-6" fill="none">
      <polyline
        points="0,20 12,14 24,16 36,8 48,10 64,2"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

interface HeroVisualProps {
  /** Override the first image. Defaults to CREATOR_IMAGES[0]. */
  creatorImageSrc?: string
}

export function HeroVisual({ creatorImageSrc }: HeroVisualProps) {
  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)

  // Override first slot if a custom src is passed
  const images = creatorImageSrc
    ? [{ src: creatorImageSrc, alt: CREATOR_IMAGES[0].alt }, ...CREATOR_IMAGES.slice(1)]
    : CREATOR_IMAGES

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(curr => {
        setPrev(curr)
        return (curr + 1) % images.length
      })
    }, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [images.length])

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">

      {/* ── Main image container ── */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10">

        {/* Render all slides; only active one is visible */}
        {images.map((img, i) => (
          <div
            key={img.src}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 2 : 1 }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover object-center"
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ))}

        {/* Warm overlay so stat cards pop */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/30 via-transparent to-transparent z-10 pointer-events-none" />

        {/* ── Floating Card 1: Video Rank (top-left) ── */}
        <div className="absolute top-5 left-5 z-20 hero-card-1">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl px-4 py-3 flex flex-col gap-1.5 min-w-[148px] ring-1 ring-slate-200/60 dark:ring-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Video Rank</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">#3</span>
              <div className="flex flex-col items-end gap-0.5">
                <Sparkline />
                <span className="text-xs font-bold text-emerald-500">+42%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Floating Card 2: Views This Week (bottom-right) ── */}
        <div className="absolute bottom-5 right-5 z-20 hero-card-2">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl px-4 py-3 flex flex-col gap-1.5 min-w-[148px] ring-1 ring-slate-200/60 dark:ring-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Views This Week</span>
              <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">24.7k</span>
              <span className="text-xs font-semibold text-emerald-500">↑ 18%</span>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-5 mt-0.5">
              {[40, 55, 35, 70, 60, 85, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-[#2563EB]/20 dark:bg-[#2563EB]/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Floating Pill 3: Published just now (top-right) ── */}
        <div className="absolute top-5 right-5 z-20 hero-card-3">
          <div className="bg-emerald-500 text-white rounded-full shadow-lg px-3.5 py-1.5 flex items-center gap-2">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">Published just now</span>
          </div>
        </div>

        {/* ── Slide indicator dots ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPrev(active); setActive(i) }}
              aria-label={`Show creator ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? 'w-6 h-2 bg-white shadow'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* CSS keyframe animations — no framer-motion needed */}
      <style>{`
        @keyframes heroCardIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes heroCardFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        .hero-card-1 {
          animation: heroCardIn 0.5s ease-out 0.3s both, heroCardFloat 4s ease-in-out 0.8s infinite;
        }
        .hero-card-2 {
          animation: heroCardIn 0.5s ease-out 0.55s both, heroCardFloat 5s ease-in-out 1.0s infinite;
        }
        .hero-card-3 {
          animation: heroCardIn 0.5s ease-out 0.8s both, heroCardFloat 3.5s ease-in-out 1.2s infinite;
        }
        @media (max-width: 480px) {
          .hero-card-2 { display: none; }
        }
      `}</style>
    </div>
  )
}
