'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

interface Question {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export function Quiz({ data, topic = "Quiz" }: { data: Question[], topic?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  
  // Track correct and incorrect counts
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)

  if (!data || data.length === 0) return null

  const currentQ = data[currentIndex]

  const handleSelect = (option: string) => {
    if (selectedAnswer) return // Prevent multiple selections
    setSelectedAnswer(option)
    
    if (option === currentQ.correct_answer) {
      setCorrectCount(c => c + 1)
    } else {
      setIncorrectCount(c => c + 1)
    }

    // Auto-advance after 3 seconds, or let user click next manually? 
    // The design doesn't show a "Next" button in the screenshots, implying auto-advance or just scrolling if multiple questions are shown. 
    // Given standard UI, we'll show a next button when an answer is selected, or auto-advance. Let's auto-advance.
    setTimeout(() => {
      if (currentIndex < data.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedAnswer(null)
      }
    }, 4000)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setCorrectCount(0)
    setIncorrectCount(0)
  }

  const getLetter = (index: number) => String.fromCharCode(65 + index) // 0->A, 1->B, etc.

  // The design shows a specific box with white background, subtle shadow.
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-10" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Header Row */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4338ca]">{topic} Quiz</h2>
        <button 
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-medium rounded-lg transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Progress Stats */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-[#64748b] tracking-wider uppercase">
          PROGRESS: {currentIndex + 1}/{data.length}
        </span>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="flex items-center gap-1 text-[#10b981]">
            <CheckCircle2 className="w-4 h-4 fill-current text-white bg-[#10b981] rounded-full" /> {correctCount}
          </span>
          <span className="flex items-center gap-1 text-[#ef4444]">
            <XCircle className="w-4 h-4 fill-current text-white bg-[#ef4444] rounded-full" /> {incorrectCount}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-[#f1f5f9] rounded-full mb-12 overflow-hidden">
        <div 
          className="h-full bg-[#4f46e5] transition-all duration-300 rounded-full"
          style={{ width: \`\${((currentIndex + (selectedAnswer ? 1 : 0)) / data.length) * 100}%\` }}
        />
      </div>

      {currentIndex >= data.length ? (
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold text-[#1e293b] mb-4">Quiz Completed!</h2>
          <p className="text-lg text-[#64748b] mb-8">You scored {correctCount} out of {data.length}.</p>
          <button onClick={handleRestart} className="px-8 py-3 bg-[#4f46e5] text-white font-bold rounded-xl">Play Again</button>
        </div>
      ) : (
        <>
          {/* Question text */}
          <div className="mb-8">
            <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider mb-3 block">
              QUESTION {currentIndex + 1}
            </span>
            <h3 className="text-2xl font-semibold text-[#1e293b] leading-relaxed">
              {currentQ.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === option
              const isCorrect = option === currentQ.correct_answer
              const showResult = selectedAnswer !== null
              
              let boxClass = "w-full text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-center "
              let letterClass = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 "
              
              if (!showResult) {
                // Default state
                boxClass += "border-[#f1f5f9] hover:border-[#cbd5e1] hover:bg-[#f8fafc] text-[#334155]"
                letterClass += "border-[#e2e8f0] text-[#94a3b8]"
              } else if (isCorrect && isSelected) {
                // Selected Correct
                boxClass += "border-[#10b981] bg-[#ecfdf5] text-[#065f46]"
                letterClass += "border-[#10b981] bg-[#10b981] text-white"
              } else if (isCorrect && !isSelected) {
                // Missed Correct
                boxClass += "border-[#f1f5f9] opacity-60 text-[#334155]"
                letterClass += "border-[#e2e8f0] text-[#94a3b8]"
              } else if (isSelected && !isCorrect) {
                // Selected Incorrect
                boxClass += "border-[#ef4444] bg-[#fef2f2] text-[#991b1b]"
                letterClass += "border-[#ef4444] bg-[#ef4444] text-white"
              } else {
                // Unselected Incorrect
                boxClass += "border-[#f1f5f9] opacity-40 text-[#334155]"
                letterClass += "border-[#e2e8f0] text-[#94a3b8]"
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  disabled={showResult}
                  className={boxClass}
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-4">
                      <div className={letterClass}>{getLetter(idx)}</div>
                      <span className="font-medium text-[16px]">{option}</span>
                    </div>
                    
                    {/* Result Icon */}
                    {showResult && isSelected && isCorrect && (
                      <CheckCircle2 className="w-6 h-6 fill-current text-white bg-[#10b981] rounded-full shrink-0" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="w-6 h-6 fill-current text-white bg-[#ef4444] rounded-full shrink-0" />
                    )}
                  </div>

                  {/* Inline Explanation */}
                  {showResult && isSelected && (
                    <div className="mt-4 pl-12">
                      <p className={\`text-sm \${isCorrect ? 'text-[#065f46]' : 'text-[#991b1b]'}\`}>
                        {isCorrect ? 'Correct! ' : 'Incorrect. '}
                        {currentQ.explanation}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
