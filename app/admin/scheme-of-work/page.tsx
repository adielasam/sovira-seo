'use client'

import { useState, useEffect } from 'react'
import { 
  Upload, GraduationCap, Loader2, CheckCircle2, Trash2, AlertCircle, 
  ChevronDown, ChevronRight, BookOpen, FileText, Settings, PlayCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  uploadSchemeOfWork,
  getAvailableSchemes,
  getWeeklyEntries,
  deleteSchemeOfWork,
} from '@/app/(dashboard)/teacher-tools/actions'
import { identifySOWsInChunk } from '@/app/(dashboard)/teacher-tools/pdf-actions'
import { CLASS_LEVELS, TERMS, NIGERIAN_SUBJECTS } from '@/app/(dashboard)/teacher-tools/constants'

// Get flat subject list for manual form
const subjectList = [...NIGERIAN_SUBJECTS.jss, ...NIGERIAN_SUBJECTS.sss].filter((v, i, a) => a.indexOf(v) === i).sort()

export default function AdminSchemeOfWorkPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'pdf'>('manual')

  // Existing schemes state
  const [schemes, setSchemes] = useState<any[]>([])
  const [loadingSchemes, setLoadingSchemes] = useState(true)
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<any[]>([])

  // --- MANUAL STATE ---
  const [subject, setSubject] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [term, setTerm] = useState('')
  const [rawText, setRawText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ sowId: string; weekCount: number } | null>(null)

  // --- PDF AUTO STATE ---
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState('')
  const [extractedSOWs, setExtractedSOWs] = useState<any[]>([])
  
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    fetchSchemes()
  }, [])

  const fetchSchemes = async () => {
    setLoadingSchemes(true)
    const result = await getAvailableSchemes()
    if (result.data) setSchemes(result.data)
    setLoadingSchemes(false)
  }

  // --- MANUAL UPLOAD LOGIC ---
  const handleManualUpload = async () => {
    if (!subject || !classLevel || !term || !rawText.trim()) {
      toast.error('Please fill all fields')
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
      fetchSchemes()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // --- PDF BATCH LOGIC ---
  const handleExtractPDF = async () => {
    if (!pdfFile) return
    setIsExtracting(true)
    setExtractedSOWs([])
    setExtractionProgress('Loading PDF engine...')
    
    try {
      // 1. Dynamically load pdf.js from CDN to run purely on client-side (bypasses Vercel limits)
      if (!(window as any).pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
          script.onload = resolve
          script.onerror = () => reject(new Error('Failed to load PDF engine'))
          document.head.appendChild(script)
        })
      }

      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'

      setExtractionProgress('Extracting text from PDF...')
      
      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        setExtractionProgress(`Reading page ${i} of ${pdf.numPages}...`)
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n'
      }

      if (!fullText.trim()) throw new Error('No text could be extracted from this PDF.')

      // Split text into ~12000 character chunks (roughly 2000 words, safely under LLM limits)
      const CHUNK_SIZE = 12000
      const chunks = []
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
        chunks.push(fullText.substring(i, i + CHUNK_SIZE))
      }

      const allFoundSOWs: any[] = []
      
      for (let i = 0; i < chunks.length; i++) {
        setExtractionProgress(`AI is analyzing part ${i + 1} of ${chunks.length}...`)
        
        const res = await identifySOWsInChunk(chunks[i])
        
        if (res.error) {
          toast.error(`Error on part ${i + 1}: ${res.error}`)
        }
        
        if (res.data && Array.isArray(res.data)) {
          allFoundSOWs.push(...res.data)
        }

        // Delay 1.5 seconds to respect Groq Free Tier rate limits (30 Requests Per Minute)
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      if (allFoundSOWs.length === 0) {
        toast.error('No valid Schemes of Work found in the document.')
      } else {
        toast.success(`Found ${allFoundSOWs.length} schemes!`)
        setExtractedSOWs(allFoundSOWs)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsExtracting(false)
      setExtractionProgress('')
    }
  }

  const handleProcessBatch = async () => {
    if (extractedSOWs.length === 0) return
    setIsProcessingBatch(true)
    setBatchProgress({ current: 0, total: extractedSOWs.length })
    
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < extractedSOWs.length; i++) {
      const sow = extractedSOWs[i]
      setBatchProgress({ current: i + 1, total: extractedSOWs.length })
      
      try {
        const result = await uploadSchemeOfWork(
          sow.subject,
          sow.class_level,
          sow.term,
          sow.raw_text
        )
        if (result.error) throw new Error(result.error)
        successCount++
      } catch (err) {
        console.error('Failed to parse:', sow.subject, err)
        failCount++
      }
    }

    setIsProcessingBatch(false)
    toast.success(`Batch complete: ${successCount} successful, ${failCount} failed.`)
    setExtractedSOWs([])
    setPdfFile(null)
    fetchSchemes()
  }

  // --- DELETE & EXPAND LOGIC ---
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Scheme of Work?')) return
    const result = await deleteSchemeOfWork(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Scheme deleted')
      fetchSchemes()
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedScheme === id) {
      setExpandedScheme(null)
      return
    }
    setExpandedScheme(id)
    const result = await getWeeklyEntries(id)
    setExpandedEntries(result.data || [])
  }

  const groupedSchemes: Record<string, any[]> = {}
  schemes.forEach((s) => {
    if (!groupedSchemes[s.class_level]) groupedSchemes[s.class_level] = []
    groupedSchemes[s.class_level].push(s)
  })

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-green-500" />
          Scheme of Work Manager
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload official NERDC Schemes of Work. Teachers use these to generate lesson notes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: Input Forms */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'manual' 
                ? 'bg-white dark:bg-slate-800 text-green-600 border-b-2 border-green-600' 
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" /> Paste Text (Manual)
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'pdf' 
                ? 'bg-white dark:bg-slate-800 text-purple-600 border-b-2 border-purple-600' 
                : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-4 h-4" /> Bulk Upload (PDF)
            </button>
          </div>

          <div className="p-6">
            {/* MANUAL MODE */}
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none">
                    <option value="">Class Level</option>
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none">
                    <option value="">Subject</option>
                    {subjectList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none">
                    <option value="">Term</option>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the Scheme of Work text here..."
                  className="w-full min-h-[300px] p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-y text-sm"
                />
                
                <button
                  onClick={handleManualUpload}
                  disabled={isUploading || !subject || !classLevel || !term || !rawText.trim()}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? <><Loader2 className="w-5 h-5 animate-spin"/> Parsing...</> : <><CheckCircle2 className="w-5 h-5"/> Parse & Save</>}
                </button>
                {uploadResult && (
                  <p className="text-green-600 text-sm font-bold text-center">Successfully saved {uploadResult.weekCount} weeks!</p>
                )}
              </div>
            )}

            {/* PDF BULK MODE */}
            {activeTab === 'pdf' && (
              <div className="space-y-6">
                
                {extractedSOWs.length === 0 ? (
                  <>
                    <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-center">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        id="pdf-upload" 
                        className="hidden"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-12 h-12 text-purple-400 mb-3" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {pdfFile ? pdfFile.name : 'Select Curriculum PDF'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          Click to browse (PDF only)
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleExtractPDF}
                      disabled={!pdfFile || isExtracting}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 transition-all"
                    >
                      {isExtracting ? (
                        <><Loader2 className="w-5 h-5 animate-spin"/> {extractionProgress}</>
                      ) : (
                        <><Settings className="w-5 h-5"/> Step 1: AI Auto-Extract Subjects</>
                      )}
                    </button>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl flex gap-3 text-sm text-purple-800 dark:text-purple-300">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>Upload a massive PDF and the AI will slice it into individual subjects, classes, and terms automatically. <b>This can take 1-2 minutes depending on PDF size.</b></p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        AI Found {extractedSOWs.length} Schemes
                      </h3>
                      <button 
                        onClick={() => { setExtractedSOWs([]); setPdfFile(null) }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        disabled={isProcessingBatch}
                      >
                        Cancel / Start Over
                      </button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 p-2 space-y-1">
                      {extractedSOWs.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{s.subject}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">{s.class_level} · {s.term}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleProcessBatch}
                      disabled={isProcessingBatch}
                      className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-500/20"
                    >
                      {isProcessingBatch ? (
                        <><Loader2 className="w-5 h-5 animate-spin"/> Processing {batchProgress.current} of {batchProgress.total}...</>
                      ) : (
                        <><PlayCircle className="w-5 h-5"/> Step 2: Save All to Database</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Existing Schemes Viewer */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Uploaded Schemes
            </h2>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">{schemes.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[400px]">
            {loadingSchemes ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : schemes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <GraduationCap className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-sm">No schemes yet.</p>
              </div>
            ) : (
              Object.entries(groupedSchemes).sort().map(([level, items]) => (
                <div key={level}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mt-3">{level}</p>
                  {items.map((scheme) => (
                    <div key={scheme.id} className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden mb-2">
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 cursor-pointer"
                        onClick={() => toggleExpand(scheme.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedScheme === scheme.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{scheme.subject}</p>
                            <p className="text-[10px] text-slate-400">{scheme.term}</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(scheme.id) }} className="p-1.5 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {expandedScheme === scheme.id && expandedEntries.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-600 p-3 space-y-1.5 bg-white dark:bg-slate-800">
                          {expandedEntries.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-2 text-xs">
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0">W{entry.week_number}</span>
                              <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{entry.topic}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
