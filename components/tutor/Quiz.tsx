'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react'

interface Question {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export function Quiz({ data }: { data: Question[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)

  if (!data || data.length === 0) return null

  const currentQ = data[currentIndex]

  const handleSelect = (option: string) => {
    if (selectedAnswer) return // Prevent multiple selections
    setSelectedAnswer(option)
    if (option === currentQ.correct_answer) {
      setScore((s) => s + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedAnswer(null)
    } else {
      setShowResults(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setShowResults(false)
  }

  if (showResults) {
    const percentage = Math.round((score / data.length) * 100)
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quiz Completed!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          You scored {score} out of {data.length} questions correctly.
        </p>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <RotateCcw className="w-5 h-5" /> Retake Quiz
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Question {currentIndex + 1} of {data.length}
        </span>
        <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          Score: {score}
        </span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 leading-relaxed">
          {currentQ.question}
        </h3>

        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswer === option
            const isCorrect = option === currentQ.correct_answer
            
            let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center "
            
            if (!selectedAnswer) {
              btnClass += "border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300"
            } else if (isCorrect) {
              btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-medium"
            } else if (isSelected && !isCorrect) {
              btnClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            } else {
              btnClass += "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 opacity-50"
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={!!selectedAnswer}
                className={btnClass}
              >
                <span>{option}</span>
                {selectedAnswer && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {selectedAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
              </button>
            )
          })}
        </div>
      </div>

      {selectedAnswer && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className={`p-5 rounded-2xl mb-6 ${
            selectedAnswer === currentQ.correct_answer 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
          }`}>
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              {selectedAnswer === currentQ.correct_answer ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Correct!</>
              ) : (
                <><XCircle className="w-4 h-4 text-red-600 dark:text-red-400" /> Incorrect</>
              )}
            </p>
            <p className={`text-sm ${
              selectedAnswer === currentQ.correct_answer ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
            }`}>
              {currentQ.explanation}
            </p>
          </div>

          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            {currentIndex < data.length - 1 ? 'Next Question' : 'View Results'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
