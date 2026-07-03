'use client'

import Image from 'next/image'
import { TrendingUp, Eye, Radio } from 'lucide-react'

// Swap creatorImageSrc to your real photo path once supplied.
// The component is fully self-contained — no backend logic.
interface HeroVisualProps {
  creatorImageSrc?: string
}

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

export function HeroVisual({ creatorImageSrc = '/images/hero-creator.jpg' }: HeroVisualProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">

      {/* ── Main creator photo ── */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10">
        <Image
          src={creatorImageSrc}
          alt="African content creator at their filming desk"
          fill
          className="object-cover object-center"
          priority
          // Graceful fallback if image not yet supplied
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        {/* Warm overlay so cards pop even if photo is bright */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/30 via-transparent to-transparent" />

        {/* Fallback illustrated background (shows while no real photo exists) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
          <div className="text-center opacity-30 dark:opacity-20">
            <div className="text-8xl mb-4">🎥</div>
            <p className="text-slate-400 text-sm font-medium">hero-creator.jpg<br/>Drop your photo in /public/images/</p>
          </div>
        </div>

        {/* ── Floating Card 1: Video Rank (top-left) ── */}
        <div className="absolute top-5 left-5 hero-card-1">
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
        <div className="absolute bottom-5 right-5 hero-card-2">
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
        <div className="absolute top-5 right-5 hero-card-3">
          <div className="bg-emerald-500 text-white rounded-full shadow-lg px-3.5 py-1.5 flex items-center gap-2">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-bold tracking-wide whitespace-nowrap">Published just now</span>
          </div>
        </div>
      </div>

      {/* CSS keyframe animations — scoped, no framer-motion needed */}
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
        /* On small screens, hide bottom-right card to avoid clutter */
        @media (max-width: 480px) {
          .hero-card-2 { display: none; }
        }
      `}</style>
    </div>
  )
}
