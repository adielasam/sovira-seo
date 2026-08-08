'use client'

import React from 'react'
import type { QuoteSlideData } from '@/app/(dashboard)/slides-agent/actions'

import type { SlideTheme } from '@/lib/slides/templates'

interface QuoteSlideProps {
  slide: QuoteSlideData
  editable?: boolean
  onUpdate?: (field: string, value: string) => void
  theme?: SlideTheme
}

export function QuoteSlide({ slide, editable, onUpdate, theme }: QuoteSlideProps) {
  const editClasses = editable
    ? 'outline-none hover:ring-1 hover:ring-orange-300 hover:ring-dashed rounded px-1 focus:ring-2 focus:ring-orange-400 transition-all cursor-text'
    : ''

  const handleBlur = (field: string) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      onUpdate(field, e.currentTarget.textContent || '')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative p-12" style={theme ? { backgroundColor: theme.colors.background } : {}}>
      <div className="text-[5rem] opacity-30 absolute top-10 left-12 leading-none font-serif" style={theme ? { color: theme.colors.accent } : { color: '#f97316' }}>
        &ldquo;
      </div>
      
      <blockquote
        className={`text-[1.5rem] italic text-center max-w-[80%] z-10 leading-relaxed mb-6 ${editClasses}`}
        style={theme ? { color: theme.colors.text, fontFamily: theme.fonts.body } : { color: '#1f2937' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('quote')}
      >
        {slide.quote}
      </blockquote>
      
      <div
        className={`text-[0.95rem] text-center font-medium ${editClasses}`}
        style={theme ? { color: theme.colors.muted, fontFamily: theme.fonts.body } : { color: '#6b7280' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('attribution')}
      >
        — {slide.attribution.replace(/^—\s*/, '')}
      </div>
    </div>
  )
}
