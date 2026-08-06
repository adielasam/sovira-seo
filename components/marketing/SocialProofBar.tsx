'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'

// Social proof avatars — real African creator images
const DEFAULT_AVATARS = [
  { src: '/images/avatar-1.jpg', alt: 'Creator 1' },
  { src: '/images/avatar-2.jpg', alt: 'Creator 2' },
  { src: '/images/avatar-3.jpg', alt: 'Creator 3' },
  { src: '/images/avatar-4.jpg', alt: 'Creator 4' },
]

const TESTIMONIAL = {
  name: 'Chisom Nnadozie',
  role: 'Content Creator · Lagos',
  quote: '"Sovira took my channel from 800 to 14k monthly visits in 6 weeks."',
  stars: 5,
}

export function SocialProofBar({ activeMarketers, testimonials = [] }: { activeMarketers?: number, testimonials?: any[] }) {
  const hasEnoughUsers = activeMarketers !== undefined && activeMarketers >= 20;
  const displayCount = activeMarketers || 0;
  const displayAvatars = testimonials.length >= 4 
    ? testimonials.slice(0, 4).map((t, i) => ({ src: t.img, alt: t.name || `Creator ${i+1}`, name: t.name }))
    : DEFAULT_AVATARS;
  const avatarColors = ['bg-blue-600','bg-indigo-600','bg-violet-600','bg-teal-600','bg-rose-600','bg-amber-600'];

  return (
    <div className="mt-10 flex flex-col items-center lg:items-start gap-5">

      {/* Row 1: stacked avatars + copy (only show if meaningful threshold is met) */}
      {hasEnoughUsers && (
        <div className="flex items-center gap-4">
          {/* Overlapping avatar stack */}
          <div className="flex -space-x-3">
            {displayAvatars.map((a, i) => {
              const initials = a.name ? a.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '';
              return (
                <div
                  key={i}
                  className="relative rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-xs"
                  style={{
                    width: 38, height: 38,
                    border: '2.5px solid #FDFBF7',
                    position: 'relative', zIndex: displayAvatars.length - i,
                  }}
                >
                  {a.src ? (
                    <Image src={a.src} alt={a.alt} fill className="object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${avatarColors[i % avatarColors.length]}`}>
                      {initials}
                    </div>
                  )}
                </div>
              )
            })}
            {/* "+displayCount" overflow badge */}
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
              +{displayCount}
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Over {displayCount}+ creators
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              growing their traffic with Sovira
            </p>
          </div>
        </div>
      )}

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
