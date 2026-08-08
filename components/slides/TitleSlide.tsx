'use client'

import React from 'react'
import type { TitleSlideData } from '@/app/(dashboard)/slides-agent/actions'

import type { SlideTheme } from '@/lib/slides/templates'

interface TitleSlideProps {
  slide: TitleSlideData
  editable?: boolean
  onUpdate?: (field: string, value: string) => void
  theme?: SlideTheme
}

export function TitleSlide({ slide, editable, onUpdate, theme }: TitleSlideProps) {
  const editClasses = editable
    ? 'outline-none hover:ring-1 hover:ring-orange-300 hover:ring-dashed rounded px-1 focus:ring-2 focus:ring-orange-400 transition-all cursor-text'
    : ''

  const handleBlur = (field: string) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      onUpdate(field, e.currentTarget.textContent || '')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full space-y-6" style={theme ? { backgroundColor: theme.colors.background } : {}}>
      <h1
        className={`text-[2.5rem] font-bold text-center max-w-4xl ${editClasses}`}
        style={theme ? { color: theme.colors.heading, fontFamily: theme.fonts.heading } : { color: '#111827' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('title')}
      >
        {slide.title}
      </h1>
      
      <div className="w-16 h-[3px] rounded-full" style={theme ? { backgroundColor: theme.colors.accent } : { backgroundColor: '#f97316' }} />
      
      <p
        className={`text-[1.25rem] text-center max-w-3xl ${editClasses}`}
        style={theme ? { color: theme.colors.muted, fontFamily: theme.fonts.body } : { color: '#6b7280' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('subtitle')}
      >
        {slide.subtitle}
      </p>
    </div>
  )
}
