'use client'

import React from 'react'
import type { TwoColumnSlideData } from '@/app/(dashboard)/slides-agent/actions'

import type { SlideTheme } from '@/lib/slides/templates'

interface TwoColumnSlideProps {
  slide: TwoColumnSlideData
  editable?: boolean
  onUpdate?: (field: string, value: any) => void
  theme?: SlideTheme
}

export function TwoColumnSlide({ slide, editable, onUpdate, theme }: TwoColumnSlideProps) {
  const editClasses = editable
    ? 'outline-none hover:ring-1 hover:ring-orange-300 hover:ring-dashed rounded px-1 focus:ring-2 focus:ring-orange-400 transition-all cursor-text'
    : ''

  const handleBlur = (field: string) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      onUpdate(field, e.currentTarget.textContent || '')
    }
  }

  const handleBulletBlur = (side: 'left' | 'right', index: number) => (e: React.FocusEvent<HTMLElement>) => {
    if (editable && onUpdate) {
      const newBullets = [...slide[side].bullets]
      newBullets[index] = e.currentTarget.textContent || ''
      onUpdate(`${side}.bullets`, newBullets)
    }
  }

  const handleKeyDown = (side: 'left' | 'right', index: number) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (!editable || !onUpdate) return

    if (e.key === 'Enter') {
      e.preventDefault()
      const newBullets = [...slide[side].bullets]
      newBullets.splice(index + 1, 0, '')
      onUpdate(`${side}.bullets`, newBullets)
    } else if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
      e.preventDefault()
      if (slide[side].bullets.length > 1) {
        const newBullets = slide[side].bullets.filter((_, i) => i !== index)
        onUpdate(`${side}.bullets`, newBullets)
      }
    }
  }

  const renderColumn = (side: 'left' | 'right') => {
    const colData = slide[side]
    return (
      <div className="flex flex-col flex-1 h-full space-y-4">
        <h3
          className={`text-[1.1rem] font-bold border-l-4 pl-3 py-1 ${editClasses}`}
          style={theme ? { color: theme.colors.heading, fontFamily: theme.fonts.heading, borderColor: theme.colors.accent } : { color: '#111827', borderColor: '#f97316' }}
          contentEditable={editable}
          suppressContentEditableWarning={true}
          onBlur={handleBlur(`${side}.heading`)}
        >
          {colData.heading}
        </h3>
        <div className="flex flex-col space-y-3">
          {colData.bullets.map((bullet, i) => (
            <div key={i} className="flex flex-row items-start space-x-3">
              <span className="mt-[0.3rem] text-sm" style={theme ? { color: theme.colors.accent } : { color: '#f97316' }}>●</span>
              <div
                className={`text-[1rem] leading-[1.6] flex-1 ${editClasses}`}
                style={theme ? { color: theme.colors.text, fontFamily: theme.fonts.body } : { color: '#1f2937' }}
                contentEditable={editable}
                suppressContentEditableWarning={true}
                onBlur={handleBulletBlur(side, i)}
                onKeyDown={handleKeyDown(side, i)}
              >
                {bullet}
              </div>
            </div>
          ))}
          {editable && colData.bullets.length === 0 && (
            <button 
              onClick={() => onUpdate && onUpdate(`${side}.bullets`, [''])}
              className="text-sm text-left hover:opacity-80"
              style={theme ? { color: theme.colors.muted } : { color: '#9ca3af' }}
            >
              + Add bullet
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col p-8" style={theme ? { backgroundColor: theme.colors.background } : {}}>
      <h2
        className={`text-[1.75rem] font-bold text-center mb-8 w-full ${editClasses}`}
        style={theme ? { color: theme.colors.heading, fontFamily: theme.fonts.heading } : { color: '#111827' }}
        contentEditable={editable}
        suppressContentEditableWarning={true}
        onBlur={handleBlur('title')}
      >
        {slide.title}
      </h2>
      
      <div className="flex-1 grid grid-cols-2 gap-8 relative h-full">
        {renderColumn('left')}
        
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2" style={theme ? { backgroundColor: theme.colors.muted, opacity: 0.2 } : { backgroundColor: '#e5e7eb' }} />
        
        {renderColumn('right')}
      </div>
    </div>
  )
}
