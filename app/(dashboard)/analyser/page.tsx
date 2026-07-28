'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, Loader2, AlertCircle, BarChart2, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { generateDatasetSummary } from '@/lib/dashboardAnalytics'
import { generateDashboardSpec, type DashboardSpec } from '@/app/actions/dashboard'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import Link from 'next/link'

type ColumnType = 'numeric' | 'date' | 'currency' | 'categorical' | 'unknown'

interface ColumnMeta {
  key: string
  type: ColumnType
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DataAnalyserPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [columnMeta, setColumnMeta] = useState<ColumnMeta[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  
  const [dashboardSpec, setDashboardSpec] = useState<DashboardSpec | null>(null)
  const [paywallDate, setPaywallDate] = useState<string | null>(null)

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
    setDashboardSpec(null)
    setPaywallDate(null)

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

    const keys = Object.keys(data[0])
    const meta: ColumnMeta[] = keys.map(key => {
      let isNumeric = true
      let isDate = true
      let isCurrency = false

      const sample = data.slice(0, 50)
      
      for (const row of sample) {
        const val = row[key]
        if (val === null || val === undefined || val === '') continue

        const strVal = String(val).trim()

        if (typeof val === 'string' && (/[\$€£₦]/.test(strVal) || /NGN/i.test(strVal))) {
          isCurrency = true
          isNumeric = false
          isDate = false
          break
        }
        
        if (isNaN(Number(val))) {
          isNumeric = false
        }

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

  const handleGenerateDashboard = async () => {
    setIsGenerating(true)
    const summary = generateDatasetSummary(parsedData, columnMeta)
    
    const res = await generateDashboardSpec(summary)
    setIsGenerating(false)

    if (res.success && res.spec) {
      setDashboardSpec(res.spec)
      toast.success('Dashboard generated successfully!')
    } else if (res.error === 'LIMIT_REACHED') {
      setPaywallDate(res.resetsAt || null)
    } else {
      toast.error(res.error || 'Failed to generate dashboard.')
    }
  }

  const renderChart = (chartSpec: any) => {
    if (chartSpec.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartSpec.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={chartSpec.categoryKey} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey={chartSpec.dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartSpec.data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey={chartSpec.categoryKey} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line type="monotone" dataKey={chartSpec.dataKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartSpec.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey={chartSpec.dataKey}
              nameKey={chartSpec.categoryKey}
            >
              {chartSpec.data.map((entry: any, index: number) => (
                <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-blue-500" />
            Data Analyser
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Upload a dataset to generate an AI-powered executive dashboard.</p>
        </div>
        {dashboardSpec && (
           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
             <AlertCircle className="w-3.5 h-3.5" />
             Usage counted
           </span>
        )}
      </div>

      {!parsedData.length && !isParsing && !dashboardSpec && (
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

      {(isParsing || isGenerating) && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {isParsing ? 'Parsing Dataset...' : 'Sovira AI is building your dashboard...'}
          </h2>
          <p className="text-sm text-slate-500">
            {isParsing ? 'Normalizing columns and detecting data types.' : 'Analyzing trends, metrics, and relationships.'}
          </p>
        </div>
      )}

      {paywallDate && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Free Limit Reached</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
            You've exhausted your 10 free Data Analyser generations for this billing cycle. Your free quota resets on <strong>{new Date(paywallDate).toLocaleDateString()}</strong>.
          </p>
          <Link 
            href="/pricing"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all"
          >
            Upgrade to Pro
          </Link>
          <button 
            onClick={() => { setParsedData([]); setFileName(null); setColumnMeta([]); setPaywallDate(null); }}
            className="mt-6 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
          >
            Start Over
          </button>
        </div>
      )}

      {dashboardSpec && !isGenerating && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
           <div className="flex justify-between items-center bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
             <div className="flex items-center gap-3">
               <FileSpreadsheet className="w-5 h-5 text-green-500" />
               <span className="font-medium text-slate-900 dark:text-white">{fileName}</span>
             </div>
             <button 
                onClick={() => { setParsedData([]); setFileName(null); setColumnMeta([]); setDashboardSpec(null); }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-md transition-colors"
              >
                Upload New File
              </button>
           </div>

           {/* KPIs */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {dashboardSpec.kpis.map((kpi, idx) => (
               <div key={idx} className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-between">
                 <p className="text-sm font-medium text-slate-500 mb-1">{kpi.title}</p>
                 <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</h4>
                 {kpi.delta && (
                   <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${
                     kpi.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' :
                     kpi.sentiment === 'negative' ? 'text-red-600 dark:text-red-400' :
                     'text-slate-500'
                   }`}>
                     {kpi.sentiment === 'positive' ? <TrendingUp className="w-4 h-4" /> : 
                      kpi.sentiment === 'negative' ? <TrendingDown className="w-4 h-4" /> : 
                      <Minus className="w-4 h-4" />}
                     {kpi.delta} vs last period
                   </div>
                 )}
               </div>
             ))}
           </div>

           {/* Charts */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {dashboardSpec.layoutOrder.map(chartId => {
               const chart = dashboardSpec.charts.find(c => c.id === chartId)
               if (!chart) return null
               return (
                 <div key={chart.id} className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{chart.title}</h3>
                   {renderChart(chart)}
                 </div>
               )
             })}
           </div>
        </div>
      )}

      {parsedData.length > 0 && !isParsing && !isGenerating && !dashboardSpec && !paywallDate && (
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
                onClick={handleGenerateDashboard}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                {isGenerating ? 'Generating Dashboard...' : 'Generate Dashboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
