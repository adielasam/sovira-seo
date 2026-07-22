'use client'

import { useState, useEffect } from 'react'
import { Upload, GraduationCap, Loader2, CheckCircle2, Trash2, AlertCircle, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

// We'll call the same server actions from the teacher-tools module
import {
  uploadSchemeOfWork,
  getAvailableSchemes,
  getWeeklyEntries,
  deleteSchemeOfWork,
  NIGERIAN_SUBJECTS,
  CLASS_LEVELS,
  TERMS,
} from '@/app/(dashboard)/teacher-tools/actions'

export default function AdminSchemeOfWorkPage() {
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

  // Subject list based on class
  const isJSS = classLevel.startsWith('JSS')
  const isSS = classLevel.startsWith('SS')
  const subjectList = isJSS
    ? NIGERIAN_SUBJECTS.jss
    : isSS
    ? NIGERIAN_SUBJECTS.sss
    : [...NIGERIAN_SUBJECTS.jss, ...NIGERIAN_SUBJECTS.sss].filter((v, i, a) => a.indexOf(v) === i).sort()

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
      toast.success(`Uploaded! ${result.weekCount} weeks parsed successfully.`)
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
    if (!confirm('Delete this Scheme of Work and all its weekly entries? Teachers will lose access to this scheme.')) return
    const result = await deleteSchemeOfWork(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Scheme deleted')
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

  // Group schemes by class level
  const groupedSchemes: Record<string, any[]> = {}
  schemes.forEach((s) => {
    if (!groupedSchemes[s.class_level]) groupedSchemes[s.class_level] = []
    groupedSchemes[s.class_level].push(s)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-green-500" />
          Scheme of Work Manager
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload official NERDC Scheme of Work for Nigerian teachers. The AI will parse it into structured weekly entries that teachers can use to generate lesson notes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Upload Form — 3 columns */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-500" />
            Upload New Scheme of Work
          </h2>

          {/* Dropdowns Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Class Level</label>
              <select
                value={classLevel}
                onChange={(e) => { setClassLevel(e.target.value); setSubject('') }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select class...</option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!classLevel}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                <option value="">Select subject...</option>
                {subjectList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select term...</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Raw Text Paste Area */}
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Paste Scheme of Work Text</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste the full scheme of work here. Example:\n\nWeek 1\nTopic: Number Bases\nSub-topic: Conversion of number bases\nObjectives: Students should be able to convert from one base to another\nContent: Binary, octal, decimal, hexadecimal number systems\nActivities: Guided practice, group work\nResources: Textbook Chapter 1, number charts\n\nWeek 2\nTopic: Fractions\n...`}
            className="w-full min-h-[320px] p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
          />

          <div className="flex items-center gap-2 mt-2 mb-4">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <p className="text-[10px] text-slate-400">
              The AI will automatically parse this text into weekly entries. Supports any format — just paste the raw SOW content from the NERDC curriculum document.
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading || !subject || !classLevel || !term || !rawText.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Parsing with AI... (15–30 seconds)
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Parse &amp; Upload Scheme of Work
              </>
            )}
          </button>

          {/* Success Message */}
          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 dark:text-green-300 text-sm">Upload successful!</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  {uploadResult.weekCount} weekly entries were parsed and saved. Teachers can now generate lesson notes and questions from this scheme.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Existing Schemes — 2 columns */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Uploaded Schemes
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
              {schemes.length} total
            </span>
          </div>

          {loadingSchemes ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading schemes...
            </div>
          ) : schemes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No schemes uploaded yet.</p>
              <p className="text-xs mt-1">Use the form to upload your first Scheme of Work.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {Object.entries(groupedSchemes).sort(([a], [b]) => a.localeCompare(b)).map(([level, items]) => (
                <div key={level}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mt-3 first:mt-0">{level}</p>
                  {items.map((scheme) => (
                    <div key={scheme.id} className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden mb-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(scheme.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedScheme === scheme.id ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{scheme.subject}</p>
                            <p className="text-[10px] text-slate-400">{scheme.term}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(scheme.id) }}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="Delete this scheme"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {expandedScheme === scheme.id && expandedEntries.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-600 p-3 space-y-1.5 bg-white dark:bg-slate-800">
                          {expandedEntries.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-2 text-xs">
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0 text-[10px]">
                                W{entry.week_number}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{entry.topic}</p>
                                {entry.sub_topic && <p className="text-slate-400 truncate">{entry.sub_topic}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
