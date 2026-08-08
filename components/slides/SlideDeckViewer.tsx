'use client'

import React, { useState } from 'react'
import { Download, X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { SlideFrame } from './SlideFrame'
import { TitleSlide } from './TitleSlide'
import { ContentSlide } from './ContentSlide'
import { TwoColumnSlide } from './TwoColumnSlide'
import { QuoteSlide } from './QuoteSlide'
import type { DeckJSON, SlideData } from '@/app/(dashboard)/slides-agent/actions'

// NOTE: exportDeckToPptx should be implemented in your app
import { exportDeckToPptx } from '@/lib/slides/exportDeckToPptx'
import toast from 'react-hot-toast'

import type { SlideTheme } from '@/lib/slides/templates'

interface SlideDeckViewerProps {
  initialDeck: DeckJSON
  onClose: () => void
  theme?: SlideTheme
}

export function SlideDeckViewer({ initialDeck, onClose, theme }: SlideDeckViewerProps) {
  const [deck, setDeck] = useState<DeckJSON>(initialDeck)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)

  const currentSlide = deck.slides[currentSlideIndex]

  const handleUpdateSlide = (slideId: string, field: string, value: any) => {
    setDeck(prev => ({
      ...prev,
      slides: prev.slides.map(s => {
        if (s.id !== slideId) return s
        if (field.includes('.')) {
          const [parent, child] = field.split('.')
          return { ...s, [parent]: { ...(s as any)[parent], [child]: value } }
        }
        return { ...s, [field]: value }
      })
    }))
  }

  const handleUpdateDeckTitle = (e: React.FocusEvent<HTMLHeadingElement>) => {
    setDeck(prev => ({ ...prev, title: e.currentTarget.textContent || 'Untitled Deck' }))
  }

  const handleExport = async () => {
    toast.loading('Generating PowerPoint...', { id: 'pptx-export' })
    try {
      await exportDeckToPptx(deck, theme)
      toast.success('Downloaded successfully!', { id: 'pptx-export' })
    } catch {
      toast.error('Export failed', { id: 'pptx-export' })
    }
  }

  const deleteSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (deck.slides.length <= 1) {
      toast.error('Cannot delete the last slide')
      return
    }
    setDeck(prev => {
      const newSlides = [...prev.slides]
      newSlides.splice(index, 1)
      return { ...prev, slides: newSlides }
    })
    if (currentSlideIndex >= index && currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1)
    }
  }

  const addSlide = (layout: SlideData['layout']) => {
    const newId = `slide-${Date.now()}`
    let newSlide: SlideData

    switch (layout) {
      case 'title':
        newSlide = { id: newId, layout: 'title', title: 'New Title', subtitle: 'Subtitle here' }
        break
      case 'content':
        newSlide = { id: newId, layout: 'content', title: 'New Content Slide', bullets: ['First point'] }
        break
      case 'two-column':
        newSlide = { id: newId, layout: 'two-column', title: 'Two Columns', left: { heading: 'Left Side', bullets: ['Point 1'] }, right: { heading: 'Right Side', bullets: ['Point 1'] } }
        break
      case 'quote':
        newSlide = { id: newId, layout: 'quote', quote: 'A brilliant quote goes here.', attribution: 'Author Name' }
        break
      default:
        return
    }

    setDeck(prev => {
      const newSlides = [...prev.slides]
      newSlides.splice(currentSlideIndex + 1, 0, newSlide)
      return { ...prev, slides: newSlides }
    })
    setCurrentSlideIndex(prev => prev + 1)
    setShowLayoutPicker(false)
  }

  const renderSlideContent = (slide: SlideData, editable: boolean) => {
    switch (slide.layout) {
      case 'title':
        return <TitleSlide slide={slide} editable={editable} onUpdate={(f, v) => handleUpdateSlide(slide.id, f, v)} theme={theme} />
      case 'content':
        return <ContentSlide slide={slide} editable={editable} onUpdate={(f, v) => handleUpdateSlide(slide.id, f, v)} theme={theme} />
      case 'two-column':
        return <TwoColumnSlide slide={slide} editable={editable} onUpdate={(f, v) => handleUpdateSlide(slide.id, f, v)} theme={theme} />
      case 'quote':
        return <QuoteSlide slide={slide} editable={editable} onUpdate={(f, v) => handleUpdateSlide(slide.id, f, v)} theme={theme} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-7xl h-full max-h-[90vh] bg-white rounded-2xl flex flex-row overflow-hidden shadow-2xl relative">
        
        {/* Left Sidebar */}
        <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 text-sm font-semibold text-gray-700">
            Slides ({deck.slides.length})
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {deck.slides.map((slide, i) => (
              <div key={slide.id} className="relative group">
                <div className="text-xs text-gray-400 mb-1">{i + 1}</div>
                <SlideFrame 
                  isThumbnail 
                  isActive={i === currentSlideIndex} 
                  onClick={() => setCurrentSlideIndex(i)}
                >
                  <div className="pointer-events-none select-none w-full h-full flex flex-col justify-center bg-white p-4">
                     {/* Simplified rendering for thumbnail */}
                     {renderSlideContent(slide, false)}
                  </div>
                </SlideFrame>
                {deck.slides.length > 1 && (
                  <button 
                    onClick={(e) => deleteSlide(e, i)}
                    className="absolute top-6 right-2 p-1 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            
            <button 
              onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-orange-500 hover:border-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Slide</span>
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col relative bg-gray-100">
          {/* Header */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
            <h1 
              className="text-lg font-bold text-gray-800 outline-none hover:ring-1 hover:ring-orange-300 rounded px-2 py-1 cursor-text transition-all"
              contentEditable
              suppressContentEditableWarning
              onBlur={handleUpdateDeckTitle}
            >
              {deck.title}
            </h1>
            
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-500 font-medium">
                Slide {currentSlideIndex + 1} / {deck.slides.length}
              </span>
              <button 
                onClick={handleExport}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center space-x-2 transition-colors"
              >
                <Download size={16} />
                <span>Export PPTX</span>
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Slide Editor */}
          <div className="flex-1 p-8 flex items-center justify-center overflow-auto relative">
            <div className="w-full max-w-5xl" style={theme ? { backgroundColor: theme.colors.background } : {}}>
              {currentSlide && (
                <SlideFrame>
                  {renderSlideContent(currentSlide, true)}
                </SlideFrame>
              )}
            </div>

            {/* Layout Picker Modal */}
            {showLayoutPicker && (
              <div className="absolute top-8 left-8 bg-white p-4 rounded-xl shadow-xl border border-gray-200 z-20 w-80">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Choose Layout</h3>
                  <button onClick={() => setShowLayoutPicker(false)} className="text-gray-400 hover:text-gray-700">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'title', label: 'Title', desc: 'Title & Subtitle' },
                    { id: 'content', label: 'Content', desc: 'Bullets' },
                    { id: 'two-column', label: 'Two Column', desc: 'Split layout' },
                    { id: 'quote', label: 'Quote', desc: 'Featured quote' }
                  ].map(layout => (
                    <button 
                      key={layout.id}
                      onClick={() => addSlide(layout.id as any)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 flex flex-col items-center text-center transition-colors"
                    >
                      <div className="w-full h-12 bg-gray-100 rounded mb-2 border border-gray-200" />
                      <span className="text-sm font-medium text-gray-800">{layout.label}</span>
                      <span className="text-xs text-gray-500">{layout.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-center space-x-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
            <button 
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-600 w-16 text-center">
              {currentSlideIndex + 1} / {deck.slides.length}
            </span>
            <button 
              onClick={() => setCurrentSlideIndex(prev => Math.min(deck.slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === deck.slides.length - 1}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
