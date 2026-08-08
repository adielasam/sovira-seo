'use client'

import React from 'react'
import type { ContentSlideData } from '@/app/(dashboard)/slides-agent/actions'

import type { SlideTheme } from '@/lib/slides/templates'

interface ContentSlideProps {
  slide: ContentSlideData
  editable?: boolean
  onUpdate?: (field: string, value: any) => void
  theme?: SlideTheme
}

export function ContentSlide({ slide, editable, onUpdate, theme }: ContentSlideProps) {
  const editClasses = editable
    ? 'outline-none hover:ring-1 hover:ring-orange-300 hover:ring-dashed rounded px-1 focus:ring-2 focus:ring-orange-400 transition-all cursor-text'
    : ''

  const handleBlur = (field: string) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      onUpdate(field, e.currentTarget.textContent || '')
    }
  }

  const handleBulletBlur = (index: number) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      const newBullets = [...slide.bullets]
      newBullets[index] = e.currentTarget.textContent || ''
      onUpdate('bullets', newBullets)
    }
  }

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (!editable || !onUpdate) return

    if (e.key === 'Enter') {
      e.preventDefault()
      const newBullets = [...slide.bullets]
      newBullets.splice(index + 1, 0, '')
      onUpdate('bullets', newBullets)
      
      // Focus will need to be handled by user clicking for now, 
      // full cursor management is complex for simple contentEditable
    } else if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
      e.preventDefault()
      if (slide.bullets.length > 1) {
        const newBullets = slide.bullets.filter((_, i) => i !== index)
        onUpdate('bullets', newBullets)
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col relative px-8 py-6" style={theme ? { backgroundColor: theme.colors.background } : {}}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={theme ? { backgroundColor: theme.colors.accent } : { backgroundColor: '#f97316' }} />
      
      <h2
        className={`text-[1.75rem] font-bold mb-8 w-full ${editClasses}`}
        style={theme ? { color: theme.colors.heading, fontFamily: theme.fonts.heading } : { color: '#111827' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('title')}
      >
        {slide.title}
      </h2>
      
      <div className="flex flex-col space-y-4 flex-1">
        {slide.bullets.map((bullet, i) => (
          <div key={i} className="flex flex-row items-start space-x-3">
            <span className="mt-[0.3rem] text-sm" style={theme ? { color: theme.colors.accent } : { color: '#f97316' }}>●</span>
            <div
              className={`text-[1rem] leading-[1.6] flex-1 ${editClasses}`}
              style={theme ? { color: theme.colors.text, fontFamily: theme.fonts.body } : { color: '#1f2937' }}
              contentEditable={editable}
              suppressContentEditableWarning={true}
              onBlur={handleBulletBlur(i)}
              onKeyDown={handleKeyDown(i)}
            >
              {bullet}
            </div>
          </div>
        ))}
        {editable && slide.bullets.length === 0 && (
          <button 
            onClick={() => onUpdate && onUpdate('bullets', [''])}
            className="text-sm text-left mt-2 hover:opacity-80"
            style={theme ? { color: theme.colors.muted } : { color: '#9ca3af' }}
          >
            + Add bullet
          </button>
        )}
      </div>
    </div>
  )
}
