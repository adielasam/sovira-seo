'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, Loader2, AlertCircle, BarChart2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

type ColumnType = 'numeric' | 'date' | 'currency' | 'categorical' | 'unknown'

interface ColumnMeta {
  key: string
  type: ColumnType
}

export default function DataAnalyserPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [columnMeta, setColumnMeta] = useState<ColumnMeta[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit. Please upload a smaller file to prevent browser freezing.')
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx'].includes(fileExt || '')) {
      toast.error('Only CSV and XLSX files are supported.')
      return
    }

    setFileName(file.name)
    setIsParsing(true)
    setParsedData([])
    setColumnMeta([])

    try {
      if (fileExt === 'csv') {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            handleParsedData(results.data)
          },
          error: (err: any) => {
            toast.error(`CSV Parsing Error: ${err.message}`)
            setIsParsing(false)
          }
        })
      } else if (fileExt === 'xlsx') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null })
        handleParsedData(json)
      }
    } catch (err: any) {
      toast.error(`Failed to read file: ${err.message}`)
      setIsParsing(false)
    }
  }

  const handleParsedData = (data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('The file appears to be empty or improperly formatted.')
      setIsParsing(false)
      return
    }

    // Auto-detect column types
    const keys = Object.keys(data[0])
    const meta: ColumnMeta[] = keys.map(key => {
      let isNumeric = true
      let isDate = true
      let isCurrency = false

      // Sample up to 50 rows to detect type
      const sample = data.slice(0, 50)
      
      for (const row of sample) {
        const val = row[key]
        if (val === null || val === undefined || val === '') continue

        const strVal = String(val).trim()

        // Check Currency markers including NGN and ₦
        if (typeof val === 'string' && (/[\$€£₦]/.test(strVal) || /NGN/i.test(strVal))) {
          isCurrency = true
          isNumeric = false
          isDate = false
          break
        }
        
        // Check if strict number
        if (isNaN(Number(val))) {
          isNumeric = false
        }

        // Check if valid date (very simple heuristic, not foolproof but good enough for generic detection)
        if (isDate && isNaN(Date.parse(strVal))) {
          isDate = false
        }
      }

      let type: ColumnType = 'categorical'
      if (isCurrency) type = 'currency'
      else if (isNumeric) type = 'numeric'
      else if (isDate) type = 'date'

      return { key, type }
    })

    setColumnMeta(meta)
    setParsedData(data)
    setIsParsing(false)
    toast.success('File parsed successfully!')
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-blue-500" />
          Data Analyser
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Upload a dataset to generate an AI-powered executive dashboard.</p>
      </div>

      {!parsedData.length && !isParsing && (
        <div 
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Drag and drop your dataset</h3>
          <p className="text-slate-500 text-sm mb-6">Supports .CSV and .XLSX files up to 10MB</p>
          
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Browse Files
            <input 
              type="file" 
              accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {isParsing && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Parsing Dataset...</h2>
          <p className="text-sm text-slate-500">Normalizing columns and detecting data types.</p>
        </div>
      )}

      {parsedData.length > 0 && !isParsing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dataset Preview</h3>
                <p className="text-sm text-slate-500">Showing top 5 rows of {parsedData.length.toLocaleString()} total rows from <span className="font-semibold text-slate-700 dark:text-slate-300">{fileName}</span></p>
              </div>
              <button 
                onClick={() => { setParsedData([]); setFileName(null); setColumnMeta([]); }}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Clear File
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {columnMeta.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span>{col.key}</span>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full w-max ${
                            col.type === 'numeric' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            col.type === 'currency' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            col.type === 'date' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {col.type}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parsedData.slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {columnMeta.map((col, colIdx) => (
                        <td key={colIdx} className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={String(row[col.key])}>
                          {row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : <span className="text-slate-400 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => toast('Aggregation Engine coming in Phase 3!', { icon: '🚧' })}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                Analyze Data
                <AlertCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
