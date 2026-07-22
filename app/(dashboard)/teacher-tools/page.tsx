'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, BookOpen, FileText, Copy, CheckCircle2, Loader2, Save, Trash2, ChevronDown, HelpCircle, RefreshCw, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import {
  getAvailableSchemes,
  getWeeklyEntries,
  generateLessonNote,
  saveLessonNote,
  getTeacherLessonNotes,
  deleteLessonNote,
  generateQuestions,
} from './actions'
import { CLASS_LEVELS, TERMS } from './constants'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  let interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return 'Just now'
}

export default function TeacherToolsPage() {
  // Selection state
  const [schemes, setSchemes] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedSowId, setSelectedSowId] = useState('')
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState<any>(null)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [lessonNote, setLessonNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Questions state
  const [questionType, setQuestionType] = useState<'objective' | 'theory' | 'mixed'>('mixed')
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [questions, setQuestions] = useState('')
  const [copiedQ, setCopiedQ] = useState(false)

  // History state
  const [history, setHistory] = useState<any[]>([])
  const [loadingSchemes, setLoadingSchemes] = useState(true)

  // Loading messages
  const [msgIndex, setMsgIndex] = useState(0)
  const generatingMessages = [
    'Preparing your lesson note...',
    'Aligning with NERDC curriculum...',
    'Structuring the lesson plan...',
    'Adding evaluation questions...',
    'Almost ready...',
  ]

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % generatingMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [isGenerating])

  // Fetch schemes on mount
  useEffect(() => {
    fetchSchemes()
    fetchHistory()
  }, [])

  const fetchSchemes = async () => {
    setLoadingSchemes(true)
    const result = await getAvailableSchemes()
    if (result.data) setSchemes(result.data)
    setLoadingSchemes(false)
  }

  const fetchHistory = async () => {
    const result = await getTeacherLessonNotes()
    if (result.data) setHistory(result.data)
  }

  // Derived lists for cascading dropdowns
  const availableSubjects = [...new Set(schemes.map((s) => s.subject))].sort()
  const availableClasses = [...new Set(
    schemes.filter((s) => !selectedSubject || s.subject === selectedSubject).map((s) => s.class_level)
  )].sort()
  const availableTerms = [...new Set(
    schemes.filter((s) => 
      (!selectedSubject || s.subject === selectedSubject) &&
      (!selectedClass || s.class_level === selectedClass)
    ).map((s) => s.term)
  )]

  // When subject+class+term selected, find matching SOW & fetch entries
  useEffect(() => {
    if (selectedSubject && selectedClass && selectedTerm) {
      const match = schemes.find(
        (s) => s.subject === selectedSubject && s.class_level === selectedClass && s.term === selectedTerm
      )
      if (match) {
        setSelectedSowId(match.id)
        fetchWeeklyEntries(match.id)
      } else {
        setSelectedSowId('')
        setWeeklyEntries([])
      }
    } else {
      setSelectedSowId('')
      setWeeklyEntries([])
    }
    setSelectedWeek(null)
    setLessonNote('')
    setQuestions('')
    setSavedId(null)
  }, [selectedSubject, selectedClass, selectedTerm])

  const fetchWeeklyEntries = async (sowId: string) => {
    const result = await getWeeklyEntries(sowId)
    if (result.data) setWeeklyEntries(result.data)
  }

  // Generate lesson note
  const handleGenerate = async () => {
    if (!selectedWeek) {
      toast.error('Please select a week first.')
      return
    }

    setIsGenerating(true)
    setLessonNote('')
    setQuestions('')
    setSavedId(null)

    try {
      const result = await generateLessonNote(
        selectedWeek.id,
        selectedSubject,
        selectedClass,
        selectedTerm,
        selectedWeek.week_number,
        selectedWeek.topic,
        selectedWeek.objectives,
        selectedWeek.content_summary,
        selectedWeek.activities,
        selectedWeek.resources
      )

      if (result.error) throw new Error(result.error)
      setLessonNote(result.lessonNote || '')
      toast.success('Lesson note generated!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // Save lesson note
  const handleSave = async () => {
    if (!lessonNote || !selectedWeek) return
    setIsSaving(true)

    try {
      const result = await saveLessonNote({
        sow_entry_id: selectedWeek.id,
        subject: selectedSubject,
        class_level: selectedClass,
        term: selectedTerm,
        week_number: selectedWeek.week_number,
        topic: selectedWeek.topic,
        lesson_note: lessonNote,
      })

      if (result.error) throw new Error(result.error)
      setSavedId(result.id || null)
      toast.success('Lesson note saved!')
      fetchHistory()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Copy
  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setter(false), 2000)
  }

  // Generate questions
  const handleGenerateQuestions = async () => {
    if (!lessonNote) {
      toast.error('Generate a lesson note first.')
      return
    }

    setIsGeneratingQuestions(true)
    setQuestions('')

    try {
      const noteId = savedId || 'unsaved'
      const result = await generateQuestions(
        noteId,
        lessonNote,
        selectedSubject,
        selectedClass,
        selectedWeek?.topic || '',
        questionType
      )

      if (result.error) throw new Error(result.error)
      setQuestions(result.questions || '')
      toast.success('Questions generated!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  // Delete from history
  const handleDelete = async (id: string) => {
    const result = await deleteLessonNote(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Deleted')
      fetchHistory()
    }
  }

  // Load from history
  const loadFromHistory = (item: any) => {
    setSelectedSubject(item.subject)
    setSelectedClass(item.class_level)
    setSelectedTerm(item.term)
    setLessonNote(item.lesson_note)
    setSavedId(item.id)
    setQuestions('')
    toast.success(`Loaded: ${item.topic}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-green-500" />
            Teacher Tools
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generate lesson notes &amp; exam questions from the official NERDC Scheme of Work.
          </p>
        </div>
      </div>

      {/* Step 1: Selection Dropdowns */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          Select Subject, Class &amp; Week
        </h2>

        {loadingSchemes ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading schemes...
          </div>
        ) : schemes.length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No Scheme of Work uploaded yet.</p>
            <Link href="/teacher-tools/upload" className="text-green-600 font-medium hover:underline">
              Upload your first Scheme of Work →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setSelectedClass(''); setSelectedTerm('') }}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose subject...</option>
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedTerm('') }}
                disabled={!selectedSubject}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <option value="">Choose class...</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Term */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={!selectedClass}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <option value="">Choose term...</option>
                {availableTerms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Week */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Week</label>
              <select
                value={selectedWeek?.id || ''}
                onChange={(e) => {
                  const entry = weeklyEntries.find((w) => w.id === e.target.value)
                  setSelectedWeek(entry || null)
                  setLessonNote('')
                  setQuestions('')
                  setSavedId(null)
                }}
                disabled={weeklyEntries.length === 0}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <option value="">Choose week...</option>
                {weeklyEntries.map((w) => (
                  <option key={w.id} value={w.id}>
                    Week {w.week_number}: {w.topic}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Selected Week Details */}
        {selectedWeek && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <h3 className="font-bold text-green-800 dark:text-green-300 text-sm mb-2">
              Week {selectedWeek.week_number}: {selectedWeek.topic}
            </h3>
            {selectedWeek.sub_topic && (
              <p className="text-xs text-green-700 dark:text-green-400 mb-1"><strong>Sub-topic:</strong> {selectedWeek.sub_topic}</p>
            )}
            {selectedWeek.objectives && (
              <p className="text-xs text-green-700 dark:text-green-400 mb-1"><strong>Objectives:</strong> {selectedWeek.objectives}</p>
            )}
            {selectedWeek.content_summary && (
              <p className="text-xs text-green-700 dark:text-green-400"><strong>Content:</strong> {selectedWeek.content_summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Generate + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Panel */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Generate Lesson Note
          </h2>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedWeek}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {generatingMessages[msgIndex]}
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                Generate Lesson Note
              </>
            )}
          </button>

          {/* Questions Section */}
          {lessonNote && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Generate Questions
              </h2>

              <div className="flex gap-2 mb-3">
                {(['objective', 'theory', 'mixed'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setQuestionType(type)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all capitalize ${
                      questionType === type
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateQuestions}
                disabled={isGeneratingQuestions}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating questions...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4" />
                    Generate {questionType.charAt(0).toUpperCase() + questionType.slice(1)} Questions
                  </>
                )}
              </button>
            </div>
          )}

          {/* Saved History */}
          {history.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Notes</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-slate-700 group"
                  >
                    <button
                      onClick={() => loadFromHistory(item)}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.topic}</p>
                      <p className="text-[10px] text-slate-400">{item.subject} · {item.class_level} · {timeAgo(item.created_at)}</p>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          {/* Lesson Note Output */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {questions ? 'Generated Questions' : 'Lesson Note'}
            </h2>
            <div className="flex items-center gap-2">
              {lessonNote && !questions && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !!savedId}
                    className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 transition-colors disabled:opacity-50"
                  >
                    {savedId ? <CheckCircle2 className="w-4 h-4" /> : isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savedId ? 'Saved' : isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleCopy(lessonNote, setCopied)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </>
              )}
              {questions && (
                <>
                  <button
                    onClick={() => setQuestions('')}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Back to Note
                  </button>
                  <button
                    onClick={() => handleCopy(questions, setCopiedQ)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    {copiedQ ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedQ ? 'Copied' : 'Copy'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-grow min-h-[400px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl overflow-y-auto">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-green-500" />
                <p className="text-sm font-medium">{generatingMessages[msgIndex]}</p>
              </div>
            ) : isGeneratingQuestions ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500" />
                <p className="text-sm font-medium">Generating {questionType} questions...</p>
              </div>
            ) : questions ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{questions}</ReactMarkdown>
              </div>
            ) : lessonNote ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonNote}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-sm">Select a subject, class, term &amp; week, then generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
