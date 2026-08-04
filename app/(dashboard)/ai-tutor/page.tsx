'use client'

import { useState, useRef } from 'react'
import { BrainCircuit, BookOpen, PenTool, LayoutTemplate, Loader2, Sparkles, AlertCircle, Download, FileText, Presentation } from 'lucide-react'
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
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State to hold the successful generation result
  const [activeResult, setActiveResult] = useState<{
    mode: TutorMode
    topic: string
    data: any
  } | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simple text file reader
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setTopic((prev) => prev ? `${prev}\n\n[File Content: ${file.name}]\n${text}` : `[File Content: ${file.name}]\n${text}`)
        toast.success(`Attached ${file.name}`)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file. Please ensure it is a text file.')
    }
    reader.readAsText(file)
    
    // Reset input
    e.target.value = ''
  }

  const handleExportPDF = async () => {
    if (!activeResult) return
    setIsExporting(true)
    const toastId = toast.loading('Generating PDF...')
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const element = document.getElementById('tutor-export-canvas')
      if (!element) throw new Error('Canvas element not found')

      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${activeResult.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
      toast.success('PDF downloaded!', { id: toastId })
    } catch (err: any) {
      toast.error('Failed to export PDF: ' + err.message, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPPTX = async () => {
    if (!activeResult) return
    setIsExporting(true)
    const toastId = toast.loading('Generating PPTX...')
    try {
      const pptxgen = (await import('pptxgenjs')).default
      const pptx = new pptxgen()
      const title = activeResult.topic

      let slide = pptx.addSlide()
      slide.addText(title, { x: 1, y: 2, w: '80%', h: 1, fontSize: 36, bold: true, align: 'center', color: '363636' })

      if (activeResult.mode === 'tutor-flashcards') {
        activeResult.data.forEach((card: any) => {
          let s = pptx.addSlide()
          s.addText(card.front, { x: 0.5, y: 1, w: '90%', fontSize: 24, bold: true, color: '003366' })
          s.addText(card.back, { x: 0.5, y: 2.5, w: '90%', fontSize: 18, color: '333333' })
        })
      } else if (activeResult.mode === 'tutor-infographic') {
        const sections = Array.isArray(activeResult.data) ? activeResult.data : (activeResult.data.sections || [])
        sections.forEach((sec: any) => {
          let s = pptx.addSlide()
          s.addText(sec.title || sec.key_point, { x: 0.5, y: 0.5, w: '90%', fontSize: 28, bold: true, color: '2E74B5' })
          if (sec.description || sec.details) {
            s.addText(sec.description || sec.details, { x: 0.5, y: 1.5, w: '90%', fontSize: 18 })
          }
          if (sec.tags) {
            s.addText(sec.tags.join(', '), { x: 0.5, y: 3, w: '90%', fontSize: 16, color: '666666', italic: true })
          }
        })
      } else if (activeResult.mode === 'tutor-quiz') {
        activeResult.data.forEach((q: any, i: number) => {
          let s = pptx.addSlide()
          s.addText(`Q${i+1}: ${q.question}`, { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true })
          const options = q.options.map((opt: string, idx: number) => `${String.fromCharCode(65+idx)}. ${opt}`).join('\\n')
          s.addText(options, { x: 0.5, y: 2, w: '90%', fontSize: 18 })
          s.addText(`Answer: ${q.correct_answer}\\nExplanation: ${q.explanation}`, { x: 0.5, y: 4, w: '90%', fontSize: 14, color: '444444' })
        })
      } else if (activeResult.mode === 'tutor-mindmap') {
        let s = pptx.addSlide()
        s.addText("Mindmap Structure", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true })
        s.addText(activeResult.data, { x: 0.5, y: 1.5, w: '90%', fontSize: 14 })
      }

      await pptx.writeFile({ fileName: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx` })
      toast.success('PPTX downloaded!', { id: toastId })
    } catch (err: any) {
      toast.error('Failed to export PPTX: ' + err.message, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

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
    <>
      {!activeResult ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] w-full max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">AI Tutor</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Turn Anything Boring into Slides, Flashcards, Quizzes, and MindMaps
            </p>
          </div>

          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col p-2 transition-shadow hover:shadow-xl relative animate-in fade-in zoom-in-95 duration-500 delay-100">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Upload a file, or enter the topic you'd like to study"
              className="w-full h-32 p-4 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none"
            />
            
            <div className="flex items-center justify-between p-2 mt-2">
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => {
                  const isActive = mode === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as TutorMode)}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                        isActive 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.csv,.json"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Upload text file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !topic.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
          {/* Left Sidebar: Controls & History */}
          <div className="w-full lg:w-80 flex flex-col gap-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-y-auto shrink-0">
            <button 
              onClick={() => setActiveResult(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              AI Tutor: {MODES.find(m => m.id === mode)?.label}
            </button>

            <div className="mt-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Ready
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Your AI notes have been completed! Below are all the deliverable files:
              </p>
              
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {activeResult.topic}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Canvas: Visualizer */}
          <div className="flex-1 bg-[#FDFBF7] dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {activeResult.topic}
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">Ready</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-200 dark:border-red-800/50 disabled:opacity-50"
                  title="Export to PDF"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  PDF
                </button>
                <button
                  onClick={handleExportPPTX}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 rounded-lg transition-colors border border-orange-200 dark:border-orange-800/50 disabled:opacity-50"
                  title="Export to PowerPoint"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                  PPTX
                </button>
              </div>
            </div>

            <div id="tutor-export-canvas" className="flex-1 overflow-y-auto p-6 lg:p-10">
              {activeResult.mode === 'tutor-flashcards' && <Flashcards data={activeResult.data} />}
              {activeResult.mode === 'tutor-quiz' && <Quiz data={activeResult.data} />}
              {activeResult.mode === 'tutor-infographic' && <Infographic data={activeResult.data} />}
              {activeResult.mode === 'tutor-mindmap' && <Mindmap markdown={activeResult.data} />}
            </div>
          </div>
        </div>
      )}
    </>
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
