'use client'

import { useState } from 'react'
import { BrainCircuit, BookOpen, PenTool, LayoutTemplate, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Flashcards } from '@/components/tutor/Flashcards'
import { Quiz } from '@/components/tutor/Quiz'
import { Infographic } from '@/components/tutor/Infographic'
import { Mindmap } from '@/components/tutor/Mindmap'

type TutorMode = 'tutor-mindmap' | 'tutor-infographic' | 'tutor-quiz' | 'tutor-flashcards'

const MODES = [
  { id: 'tutor-mindmap', label: 'Mindmap', icon: BrainCircuit },
  { id: 'tutor-infographic', label: 'Infographics', icon: LayoutTemplate },
  { id: 'tutor-quiz', label: 'Quiz', icon: PenTool },
  { id: 'tutor-flashcards', label: 'Flashcards', icon: BookOpen },
]

export default function AITutorPage() {
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<TutorMode>('tutor-mindmap')
  const [isLoading, setIsLoading] = useState(false)
  
  // State to hold the successful generation result
  const [activeResult, setActiveResult] = useState<{
    mode: TutorMode
    topic: string
    data: any
  } | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic to study.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, text: topic }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate tutor content')
      }

      let parsedData = data.result
      
      // Parse JSON if the mode expects JSON
      if (mode !== 'tutor-mindmap') {
        try {
          // Clean up potential markdown formatting in JSON response (e.g., ```json ... ```)
          const cleanJson = data.result.replace(/```json/g, '').replace(/```/g, '').trim()
          parsedData = JSON.parse(cleanJson)
        } catch (e) {
          console.error("Failed to parse JSON response:", data.result)
          throw new Error('AI returned invalid format. Please try again.')
        }
      }

      setActiveResult({ mode, topic, data: parsedData })
      toast.success('Study materials generated!')
      
      // Log activity
      fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AI Tutor Generated', details: { mode, topicLength: topic.length } })
      }).catch(console.error)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left Sidebar: Controls */}
      <div className="w-full lg:w-96 flex flex-col gap-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            AI Tutor
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Turn anything boring into interactive learning materials.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              What would you like to study?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Upload a file, or enter the topic you'd like to study (e.g., 'What is data?', 'Photosynthesis', or paste an article)..."
              className="w-full h-32 p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Output Format
            </label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => {
                const isActive = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as TutorMode)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full transition-all border ${
                      isActive 
                        ? 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isLoading ? 'Generating Magic...' : 'Generate Learning Material'}
          </button>
        </div>

        {/* History / Status Area */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Current Session</h3>
          {activeResult ? (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Ready to learn!
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-semibold">
                {activeResult.topic.slice(0, 40)}{activeResult.topic.length > 40 ? '...' : ''}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {MODES.find(m => m.id === activeResult.mode)?.label}
              </p>
            </div>
          ) : (
            <div className="text-center p-6 text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
              There's nothing here yet. Generate a lesson above!
            </div>
          )}
        </div>
      </div>

      {/* Right Canvas: Visualizer */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {!activeResult ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <BrainCircuit className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Your Interactive Canvas</h2>
            <p className="max-w-md">
              Enter a topic on the left and select a mode. Your generated Flashcards, Quizzes, Infographics, or Mindmaps will magically appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative bg-slate-50/50 dark:bg-[#0F172A]/50">
            {/* Dynamic Title */}
            <div className="mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white capitalize">
                {MODES.find(m => m.id === activeResult.mode)?.label}: <span className="text-purple-600 dark:text-purple-400 font-normal">{activeResult.topic.slice(0, 50)}</span>
              </h2>
            </div>
            
            {/* Render the appropriate visualizer component */}
            {activeResult.mode === 'tutor-flashcards' && <Flashcards data={activeResult.data} />}
            {activeResult.mode === 'tutor-quiz' && <Quiz data={activeResult.data} />}
            {activeResult.mode === 'tutor-infographic' && <Infographic data={activeResult.data} />}
            {activeResult.mode === 'tutor-mindmap' && <Mindmap markdown={activeResult.data} />}
          </div>
        )}
      </div>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
