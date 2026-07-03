'use client'

import { Star } from 'lucide-react'

// Social proof avatars — initials + background colours, no external images
const AVATARS = [
  { initials: 'AO', bg: '#2563EB' },
  { initials: 'CB', bg: '#7C3AED' },
  { initials: 'NK', bg: '#059669' },
  { initials: 'TH', bg: '#DC2626' },
  { initials: 'EM', bg: '#D97706' },
]

const TESTIMONIAL = {
  name: 'Chisom Nnadozie',
  role: 'Content Creator · Lagos',
  quote: '"Sovira took my channel from 800 to 14k monthly visits in 6 weeks."',
  stars: 5,
}

export function SocialProofBar() {
  return (
    <div className="mt-10 flex flex-col items-center lg:items-start gap-5">

      {/* Row 1: stacked avatars + copy */}
      <div className="flex items-center gap-4">
        {/* Overlapping avatar stack */}
        <div className="flex -space-x-3">
          {AVATARS.map((a, i) => (
            <div
              key={i}
              title={a.initials}
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                background: a.bg,
                border: '2.5px solid #FDFBF7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                position: 'relative', zIndex: AVATARS.length - i,
              }}
            >
              {a.initials}
            </div>
          ))}
          {/* "+520" overflow badge */}
          <div
            style={{
              width: 38, height: 38,
              borderRadius: '50%',
              background: '#F1F5F9',
              border: '2.5px solid #FDFBF7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#64748B',
              position: 'relative', zIndex: 0,
            }}
          >
            +520
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Over 520+ creators
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            growing their traffic with Sovira
          </p>
        </div>
      </div>

      {/* Row 2: floating testimonial card */}
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 px-5 py-4 flex flex-col gap-2 max-w-xs"
        style={{ animation: 'spCardIn 0.6s ease-out 0.4s both' }}
      >
        {/* Stars */}
        <div className="flex gap-0.5">
          {Array.from({ length: TESTIMONIAL.stars }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug italic">
          {TESTIMONIAL.quote}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}
          >
            CN
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{TESTIMONIAL.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{TESTIMONIAL.role}</p>
          </div>
          {/* Verified badge */}
          <span className="ml-auto text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
            ✓ Verified
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spCardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
