'use client'

import { useState, useEffect } from 'react'
import { Upload, BookOpen, Loader2, CheckCircle2, Trash2, ArrowLeft, GraduationCap, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  uploadSchemeOfWork,
  getAvailableSchemes,
  getWeeklyEntries,
  deleteSchemeOfWork,
  NIGERIAN_SUBJECTS,
  CLASS_LEVELS,
  TERMS,
} from '../actions'

export default function UploadSOWPage() {
  const [subject, setSubject] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [term, setTerm] = useState('')
  const [rawText, setRawText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ sowId: string; weekCount: number } | null>(null)

  // Existing schemes
  const [schemes, setSchemes] = useState<any[]>([])
  const [loadingSchemes, setLoadingSchemes] = useState(true)
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<any[]>([])

  // Determine which subjects to show based on selected class
  const isJSS = classLevel.startsWith('JSS')
  const isSS = classLevel.startsWith('SS')
  const subjectList = isJSS ? NIGERIAN_SUBJECTS.jss : isSS ? NIGERIAN_SUBJECTS.sss : [...NIGERIAN_SUBJECTS.jss, ...NIGERIAN_SUBJECTS.sss].filter((v, i, a) => a.indexOf(v) === i).sort()

  useEffect(() => {
    fetchSchemes()
  }, [])

  const fetchSchemes = async () => {
    setLoadingSchemes(true)
    const result = await getAvailableSchemes()
    if (result.data) setSchemes(result.data)
    setLoadingSchemes(false)
  }

  const handleUpload = async () => {
    if (!subject || !classLevel || !term) {
      toast.error('Please select subject, class, and term.')
      return
    }
    if (!rawText.trim() || rawText.trim().length < 50) {
      toast.error('Please paste the full Scheme of Work text (at least 50 characters).')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const result = await uploadSchemeOfWork(subject, classLevel, term, rawText)

      if (result.error) throw new Error(result.error)

      setUploadResult({ sowId: result.sowId!, weekCount: result.weekCount! })
      toast.success(`Uploaded! ${result.weekCount} weeks parsed.`)
      setRawText('')
      setSubject('')
      setClassLevel('')
      setTerm('')
      fetchSchemes()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Scheme of Work and all its weekly entries?')) return
    const result = await deleteSchemeOfWork(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Deleted')
      fetchSchemes()
      if (expandedScheme === id) {
        setExpandedScheme(null)
        setExpandedEntries([])
      }
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedScheme === id) {
      setExpandedScheme(null)
      setExpandedEntries([])
      return
    }
    setExpandedScheme(id)
    const result = await getWeeklyEntries(id)
    setExpandedEntries(result.data || [])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/teacher-tools"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Upload className="w-7 h-7 text-green-500" />
            Upload Scheme of Work
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Paste the official NERDC Scheme of Work and the AI will parse it into structured weekly entries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            New Scheme of Work
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* Class (select first so subjects filter) */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Class</label>
              <select
                value={classLevel}
                onChange={(e) => { setClassLevel(e.target.value); setSubject('') }}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose class...</option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!classLevel}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <option value="">Choose subject...</option>
                {subjectList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Term */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose term...</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Raw Text Input */}
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Paste Scheme of Work Text</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste the full scheme of work here. Example format:\n\nWeek 1: Introduction to Basic Science\nObjectives: Define science, list branches of science\nContent: Meaning of science, branches...\n\nWeek 2: Living and Non-living things\nObjectives: Differentiate between living and non-living things...\n\n(Paste the complete SOW for all weeks of the term)`}
            className="w-full flex-grow min-h-[300px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
          />

          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
            <AlertCircle className="w-3.5 h-3.5" />
            The AI will automatically parse this text into weekly entries. Supports any format — just paste the raw SOW text.
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading || !subject || !classLevel || !term || !rawText.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Parsing with AI... This may take 15-30s
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Parse &amp; Upload Scheme of Work
              </>
            )}
          </button>

          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 dark:text-green-300 text-sm">Upload successful!</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  {uploadResult.weekCount} weekly entries were parsed and saved. Teachers can now generate lesson notes from this scheme.
                </p>
                <Link href="/teacher-tools" className="text-xs font-medium text-green-600 hover:underline mt-2 inline-block">
                  Go to Teacher Tools →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Existing Schemes */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Uploaded Schemes ({schemes.length})
          </h2>

          {loadingSchemes ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : schemes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No schemes uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {schemes.map((scheme) => (
                <div key={scheme.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0F172A]">
                    <button
                      onClick={() => toggleExpand(scheme.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{scheme.subject}</p>
                      <p className="text-[10px] text-slate-400">{scheme.class_level} · {scheme.term}</p>
                    </button>
                    <button
                      onClick={() => handleDelete(scheme.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedScheme === scheme.id && expandedEntries.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
                      {expandedEntries.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs">
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                            W{entry.week_number}
                          </span>
                          <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">{entry.topic}</p>
                            {entry.sub_topic && <p className="text-slate-400">{entry.sub_topic}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
