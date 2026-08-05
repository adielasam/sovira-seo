'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, HelpCircle, Check } from 'lucide-react'
import { ShareButton } from './ShareButton'

interface Flashcard {
  term: string
  definition: string
}

export function Flashcards({ data, topic = "Flashcards", subtopic = "Review your knowledge" }: { data: Flashcard[], topic?: string, subtopic?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  if (!data || data.length === 0) return null

  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150)
    }
  }

  const currentCard = data[currentIndex]

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-extrabold text-[#0f172a] mb-2">{topic}</h2>
        <p className="text-[#64748b]">{subtopic}</p>
      </div>

      {/* Card Deck Area */}
      <div className="relative w-full max-w-[420px] aspect-[3/4] mb-12">
        {/* Decorative background cards to create a "stack" effect */}
        {currentIndex < data.length - 1 && (
          <div className="absolute top-4 left-4 right-[-16px] bottom-[-16px] bg-white rounded-3xl border border-slate-200 z-0" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} />
        )}
        {currentIndex < data.length - 2 && (
          <div className="absolute top-2 left-2 right-[-8px] bottom-[-8px] bg-white rounded-3xl border border-slate-200 z-0" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} />
        )}

        {/* The Active Card */}
        <div 
          className="absolute inset-0 cursor-pointer perspective-1000 z-10"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d shadow-xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front (Dark Blue) */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-[#0f172a] rounded-3xl flex flex-col p-8">
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Question Icon */}
                <div className="absolute top-0 w-12 h-12 rounded-full border-2 border-[#3b82f6] flex items-center justify-center text-[#3b82f6] mb-8">
                  <HelpCircle size={24} />
                </div>
                
                {/* Term/Question */}
                <h3 className="text-2xl md:text-3xl font-bold text-center text-white leading-snug mt-16">
                  {currentCard.term}
                </h3>
              </div>

              {/* Footer */}
              <div className="text-center mt-auto pt-4">
                <span className="text-xs font-bold text-[#475569] tracking-[0.2em] uppercase">
                  TAP TO FLIP
                </span>
              </div>
            </div>

            {/* Back (White) */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white rounded-3xl border border-slate-200 flex flex-col p-8">
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Checkmark Icon */}
                <div className="absolute top-0 text-[#10b981] mb-8">
                  <Check size={40} />
                </div>
                
                {/* Definition/Answer */}
                <p className="text-xl md:text-2xl text-center text-[#334155] leading-relaxed mt-16">
                  {currentCard.definition}
                </p>
              </div>

              {/* Footer */}
              <div className="text-center mt-auto pt-4">
                <span className="text-xs font-bold text-[#94a3b8] tracking-[0.15em] uppercase">
                  KNOWLEDGE REFERENCE
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-8 relative z-20">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col items-center">
          <div className="font-bold text-[#0f172a] text-lg mb-1">
            {currentIndex + 1} <span className="text-slate-400 font-medium">/ {data.length}</span>
          </div>
          {/* Small progress line */}
          <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-[#3b82f6] rounded-full transition-all" style={{ width: `${((currentIndex + 1) / data.length) * 100}%` }} />
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === data.length - 1}
          className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          <ArrowRight size={24} />
        </button>
      </div>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
      
      <ShareButton title="Flashcard" />
    </div>
  )
}
