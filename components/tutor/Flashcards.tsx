'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

interface Flashcard {
  term: string
  definition: string
}

export function Flashcards({ data }: { data: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  if (!data || data.length === 0) return null

  const handleNext = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % data.length)
    }, 150)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + data.length) % data.length)
    }, 150)
  }

  const currentCard = data[currentIndex]

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="mb-4 text-sm font-medium text-slate-500">
        Card {currentIndex + 1} of {data.length}
      </div>

      <div 
        className="relative w-full aspect-video cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`absolute inset-0 w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front (Term) */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center p-8">
            <h3 className="text-3xl font-bold text-center text-slate-900 dark:text-white">{currentCard.term}</h3>
            <div className="absolute bottom-4 flex items-center gap-2 text-xs text-slate-400">
              <RotateCcw className="w-3 h-3" /> Click to flip
            </div>
          </div>

          {/* Back (Definition) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-md border border-blue-200 dark:border-blue-800 flex items-center justify-center p-8">
            <p className="text-lg text-center text-slate-800 dark:text-slate-200 leading-relaxed">
              {currentCard.definition}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={handlePrev}
          className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}
