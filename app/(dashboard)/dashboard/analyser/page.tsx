'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Loader2, AlertCircle, BarChart2, TrendingUp, TrendingDown, Minus, Lock, Download, FileText } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { generateDatasetSummary } from '@/lib/dashboardAnalytics'
import { generateDashboardSpec, type DashboardSpec } from '@/app/actions/dashboard'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import Link from 'next/link'
import { useTheme } from 'next-themes'

type ColumnType = 'numeric' | 'date' | 'currency' | 'categorical' | 'unknown'

interface ColumnMeta {
  key: string
  type: ColumnType
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export const maxDuration = 60

export default function DataAnalyserPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [columnMeta, setColumnMeta] = useState<ColumnMeta[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  
  const [dashboardSpec, setDashboardSpec] = useState<DashboardSpec | null>(null)
  const [paywallDate, setPaywallDate] = useState<string | null>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    try {
      // 1. Wait for any Recharts SVG animations to finish drawing (default is ~1500ms)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 2. Temporarily add a white background for the PDF capture since it might be transparent
      const originalBg = dashboardRef.current.style.backgroundColor
      dashboardRef.current.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc'
      
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true })
      
      dashboardRef.current.style.backgroundColor = originalBg

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 0

      // 3. Multi-page slicing: add the first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pageHeight

      // Add subsequent pages if the dashboard content is taller than one A4 page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`sovira-ai-dashboard-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF downloaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setIsExporting(false)
    }
  }

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
    try {
      const summary = generateDatasetSummary(parsedData, columnMeta)
      const res = await generateDashboardSpec(summary)
      
      if (res.success && res.spec) {
        setDashboardSpec(res.spec)
        toast.success('Dashboard generated successfully!')
      } else if (res.error === 'LIMIT_REACHED') {
        setPaywallDate(res.resetsAt || null)
        toast.error(`Monthly limit reached. Please upgrade to continue.`, { duration: 8000 })
      } else {
        toast.error(`Generation Failed: ${res.error || 'Unknown error'}`, { duration: 8000 })
      }
    } catch (err: any) {
      console.error('Dashboard Generation Crash:', err)
      toast.error(`System Error: ${err.message || 'A network or server error occurred. Please try again.'}`, { duration: 8000 })
    } finally {
      setIsGenerating(false)
    }
  }

  const renderChart = (chartSpec: any) => {
    const commonTooltipStyle = {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      borderRadius: '8px',
      color: isDark ? '#f8fafc' : '#0f172a',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(8px)'
    };
    const commonAxisStyle = { stroke: isDark ? '#475569' : '#94a3b8', fontSize: 11, tickLine: false, axisLine: false };
    const commonGridStyle = { stroke: isDark ? '#1e293b' : '#f1f5f9', strokeDasharray: '3 3', vertical: false };

    if (chartSpec.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartSpec.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={commonTooltipStyle} />
            <Bar dataKey={chartSpec.dataKey} fill={isDark ? "#06b6d4" : "#2563eb"} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip contentStyle={commonTooltipStyle} />
            <Line type="monotone" dataKey={chartSpec.dataKey} stroke={isDark ? "#a855f7" : "#8b5cf6"} strokeWidth={3} dot={{ r: 4, fill: isDark ? '#1e293b' : '#fff', stroke: isDark ? '#a855f7' : '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6, fill: isDark ? '#a855f7' : '#8b5cf6', stroke: isDark ? '#fff' : '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'pie') {
      const PIE_COLORS = ['#06b6d4', '#a855f7', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartSpec.data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={4}
              dataKey={chartSpec.dataKey}
              nameKey={chartSpec.categoryKey}
              stroke="none"
            >
              {chartSpec.data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={commonTooltipStyle} itemStyle={{ color: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
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
          <div className="flex items-center gap-3">
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
               <AlertCircle className="w-3.5 h-3.5" />
               Usage counted
             </span>
             <button
               onClick={handleExportPDF}
               disabled={isExporting}
               className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
             >
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
               {isExporting ? 'Generating PDF...' : 'Download PDF Report'}
             </button>
          </div>
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
        <div ref={dashboardRef} className="animate-in slide-in-from-bottom-4 duration-700 mt-4 bg-white dark:bg-slate-900 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 text-slate-900 dark:text-white font-sans w-full rounded-xl">
           {/* Header */}
           <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 rounded-t-xl">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2563EB] to-blue-600 flex items-center justify-center shadow-md">
                 <FileSpreadsheet className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                   {fileName?.split('.')[0] || 'Executive'} Dashboard
                 </h2>
                 <p className="text-xs font-semibold tracking-widest text-[#2563EB] dark:text-cyan-400 uppercase mt-0.5">Sovira AI Analytics</p>
               </div>
             </div>
             <button 
                onClick={() => { setParsedData([]); setFileName(null); setColumnMeta([]); setDashboardSpec(null); }}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md shadow-sm transition-all"
                data-html2canvas-ignore="true"
             >
                New Analysis
             </button>
           </div>

           <div className="p-6 space-y-6">
             {/* KPIs Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {dashboardSpec.kpis.map((kpi, idx) => {
                 const isPos = kpi.sentiment === 'positive'
                 const isNeg = kpi.sentiment === 'negative'
                 
                 // Dynamic classes adapting to light/dark
                 const colorClass = isPos ? 'text-emerald-600 dark:text-emerald-400' : isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                 const bgClass = isPos ? 'bg-emerald-100 dark:bg-emerald-400/10' : isNeg ? 'bg-rose-100 dark:bg-rose-400/10' : 'bg-slate-100 dark:bg-slate-400/10'
                 const borderClass = isPos ? 'border-emerald-200 dark:border-emerald-400/20' : isNeg ? 'border-rose-200 dark:border-rose-400/20' : 'border-slate-200 dark:border-slate-400/20'
                 
                 const pseudoPercentage = 65 + (idx * 10) % 30
                 
                 return (
                   <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                     {/* Left accent line instead of top */}
                     <div className={`absolute top-0 left-0 bottom-0 w-1 ${isPos ? 'bg-emerald-500' : isNeg ? 'bg-rose-500' : 'bg-slate-400'}`} />
                     
                     <div className="flex justify-between items-start mb-2 pl-3">
                       <p className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{kpi.title}</p>
                     </div>
                     
                     <div className="flex items-end justify-between mt-4 pl-3">
                       <div>
                         <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpi.value}</h4>
                         {kpi.delta && (
                           <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${bgClass} ${colorClass} border ${borderClass}`}>
                             {isPos ? <TrendingUp className="w-3 h-3" /> : isNeg ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                             {kpi.delta}
                           </div>
                         )}
                       </div>
                       
                       <div className="relative w-12 h-12 flex items-center justify-center">
                         <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                           <path className="text-slate-100 dark:text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                           <path className={colorClass} strokeWidth="4" strokeDasharray={`${pseudoPercentage}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                         </svg>
                         <span className="absolute text-[9px] font-bold text-slate-600 dark:text-slate-300">{pseudoPercentage}%</span>
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>

             {/* Charts Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Executive Summary takes up full width or half width */}
               {dashboardSpec.executiveSummary && (
                 <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                   <h3 className="text-xs font-bold tracking-widest text-[#2563EB] dark:text-cyan-400 uppercase mb-3 flex items-center gap-2">
                     <FileText className="w-4 h-4" />
                     Executive Insight
                   </h3>
                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                     {dashboardSpec.executiveSummary}
                   </p>
                 </div>
               )}
               
               {dashboardSpec.layoutOrder.map((chartId, i) => {
                 const chart = dashboardSpec.charts.find(c => c.id === chartId)
                 if (!chart) return null
                 return (
                   <div key={chart.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                     <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white mb-6 uppercase flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-[#2563EB] dark:bg-cyan-500' : 'bg-[#10B981] dark:bg-purple-500'}`} />
                       {chart.title}
                     </h3>
                     <div className="relative z-10">
                       {renderChart(chart, isDark)}
                     </div>
                   </div>
                 )
               })}
             </div>
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

      {paywallDate && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 text-center animate-in fade-in duration-500 max-w-xl mx-auto mt-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Monthly Limit Reached</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            You have reached your free monthly limit of 10 AI Dashboard generations. 
            Upgrade to a premium plan for unlimited insights, or wait until your limit resets on <span className="font-semibold text-slate-900 dark:text-white">{new Date(paywallDate).toLocaleDateString()}</span>.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => { setPaywallDate(null); setParsedData([]); setFileName(null); setColumnMeta([]); }}
              className="px-6 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 transition-all"
            >
              Start Over
            </button>
            <a href="/pricing" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all">
              View Pricing
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
