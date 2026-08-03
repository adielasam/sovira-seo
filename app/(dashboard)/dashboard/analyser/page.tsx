'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Loader2, AlertCircle, BarChart2, Download, FileText, CheckCircle2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { processDataPipeline } from '@/lib/dataPipeline'
import { generateDashboardAggregates, AggregatedDashboardData } from '@/lib/dashboardAggregator'
import { generateExecutiveInsight } from '@/app/actions/dashboard'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useTheme } from 'next-themes'
import Link from 'next/link'

export const maxDuration = 60

export default function DataAnalyserPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  
  const [dashboardData, setDashboardData] = useState<AggregatedDashboardData | null>(null)
  const [executiveInsight, setExecutiveInsight] = useState<string | null>(null)
  const [paywallDate, setPaywallDate] = useState<string | null>(null)
  
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingForPDF, setIsExportingForPDF] = useState(false)

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    setIsExportingForPDF(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const originalWidth = dashboardRef.current.style.width
      const originalMaxWidth = dashboardRef.current.style.maxWidth
      const originalBg = dashboardRef.current.style.backgroundColor
      
      dashboardRef.current.style.width = '1200px'
      dashboardRef.current.style.maxWidth = '1200px'
      dashboardRef.current.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc'
      
      void dashboardRef.current.offsetHeight
      
      const imgData = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2 })
      
      dashboardRef.current.style.backgroundColor = originalBg
      dashboardRef.current.style.width = originalWidth
      dashboardRef.current.style.maxWidth = originalMaxWidth

      const link = document.createElement('a')
      link.href = imgData
      link.download = `sovira-ai-dashboard-${new Date().toISOString().split('T')[0]}.png`
      link.click()
      
      toast.success('PNG downloaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to generate PNG: ${err.message}`)
    } finally {
      setIsExporting(false)
      setIsExportingForPDF(false)
    }
  }

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    try {
      setIsExportingForPDF(true)
      await new Promise(resolve => setTimeout(resolve, 800))

      const originalWidth = dashboardRef.current.style.width
      const originalMaxWidth = dashboardRef.current.style.maxWidth
      const originalBg = dashboardRef.current.style.backgroundColor
      
      dashboardRef.current.style.width = '1200px'
      dashboardRef.current.style.maxWidth = '1200px'
      dashboardRef.current.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc'
      
      void dashboardRef.current.offsetHeight 
      
      const imgData = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2 })
      
      dashboardRef.current.style.backgroundColor = originalBg
      dashboardRef.current.style.width = originalWidth
      dashboardRef.current.style.maxWidth = originalMaxWidth

      const pdf = new jsPDF('p', 'mm', 'a4')
      const img = new Image()
      img.src = imgData
      await new Promise((resolve) => { img.onload = resolve })

      const canvasWidth = img.width
      const canvasHeight = img.height
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth
      
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`sovira-ai-dashboard-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF downloaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to generate PDF: ${err.message}`)
    } finally {
      setIsExporting(false)
      setIsExportingForPDF(false)
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

    const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const fileType = file.type.toLowerCase();

    setFileName(file.name)
    setIsParsing(true)
    setDashboardData(null)
    setExecutiveInsight(null)
    setPaywallDate(null)

    try {
      let rawData: any[] = []
      
      // If it looks like a text file or CSV, use PapaParse
      if (['csv', 'tsv', 'txt'].includes(fileExt || '') || fileType.includes('csv') || fileType.includes('text')) {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
        rawData = parsed.data
      } else {
        // For everything else, assume it's some form of Excel (XLSX, XLS, XLSM) and let the XLSX library try to parse it
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', bookVBA: true })
        
        if (workbook.vbaraw) {
          toast.error("This file contains macros, which we don't support for security reasons — please save as .xlsx and re-upload.")
          setIsParsing(false)
          return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null })
      }

      if (rawData.length === 0) {
        toast.error('The file appears to be empty.')
        setIsParsing(false)
        return
      }

      // Phase 1 + 2 Pipeline
      const pipelineResult = processDataPipeline(rawData)
      const aggregates = generateDashboardAggregates(pipelineResult)

      if (aggregates.lowDataQuality) {
        toast.error('Low Data Quality detected. The dashboard may have limited capabilities.')
      } else {
        toast.success('Data successfully analyzed!')
      }

      setDashboardData(aggregates)
      setIsParsing(false)
      
      // Auto-trigger AI Insight generation
      generateAIInsight(aggregates)

    } catch (err: any) {
      toast.error(`Failed to read file: ${err.message}`)
      setIsParsing(false)
    }
  }

  const generateAIInsight = async (aggregates: AggregatedDashboardData) => {
    setIsGenerating(true)
    try {
      const res = await generateExecutiveInsight(aggregates.aiInsightContext)
      if (res.success && res.insight) {
        setExecutiveInsight(res.insight)
      } else {
        console.error("AI Error:", res.error)
        toast.error('Failed to generate AI Insight. Showing dashboard with raw data.')
      }
    } catch (err) {
      console.error(err)
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
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartSpec.data.slice(0, 15)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={commonTooltipStyle} />
            <Bar isAnimationActive={!isExportingForPDF} dataKey={chartSpec.dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip contentStyle={commonTooltipStyle} />
            <Line isAnimationActive={!isExportingForPDF} type="monotone" dataKey={chartSpec.dataKey} stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: isDark ? '#1e293b' : '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  const formatKPIValue = (value: any, format: string) => {
    if (format === 'currency') {
      return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    if (format === 'percent') {
      return Number(value).toFixed(1) + '%'
    }
    if (format === 'number') {
      return Number(value).toLocaleString()
    }
    return String(value)
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
        {dashboardData && (
          <div className="flex items-center gap-3">
             <button
               onClick={handleExportPNG}
               disabled={isExporting}
               className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
             >
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
               Download PNG
             </button>
             <button
               onClick={handleExportPDF}
               disabled={isExporting}
               className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
             >
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
               Download PDF
             </button>
             <button 
                onClick={() => { setFileName(null); setDashboardData(null); setExecutiveInsight(null); }}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md shadow-sm transition-all"
             >
                New Analysis
             </button>
          </div>
        )}
      </div>

      {!dashboardData && !isParsing && (
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
          <p className="text-slate-500 text-sm mb-6">Supports any tabular data file (CSV, Excel, TXT) up to 10MB</p>
          
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Browse Files
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {isParsing && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Processing Data Pipeline...
          </h2>
          <p className="text-sm text-slate-500">Detecting column types and executing Arquero aggregations.</p>
        </div>
      )}

      {dashboardData && (
        <div ref={dashboardRef} className="animate-in slide-in-from-bottom-4 duration-700 mt-4 bg-slate-50 dark:bg-slate-900 p-6 rounded-xl w-full border border-slate-200 dark:border-slate-800">
           
           {/* Top Insight + Quality Panel */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="md:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                 <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2">
                   <FileText className="w-4 h-4 text-blue-500" />
                   AI Executive Insight
                 </h3>
                 {isGenerating ? (
                   <div className="flex items-center gap-2 text-slate-500 mt-2">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="text-sm font-medium">Gemini is analyzing the aggregated data...</span>
                   </div>
                 ) : (
                   <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                     {executiveInsight || "No insight generated."}
                   </p>
                 )}
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
                 <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 text-center">Data Quality</h3>
                 <div className="relative w-20 h-20 flex items-center justify-center">
                   <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                     <path className="text-slate-100 dark:text-slate-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     <path className={dashboardData.lowDataQuality ? "text-rose-500" : "text-emerald-500"} strokeWidth="3" strokeDasharray={`${dashboardData.dataQualityBadge}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                     <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{dashboardData.dataQualityBadge}%</span>
                   </div>
                 </div>
                 {dashboardData.lowDataQuality && (
                   <span className="mt-3 text-[10px] uppercase tracking-wider font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full">Low Quality</span>
                 )}
              </div>
           </div>

           {/* KPIs Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             {dashboardData.kpis.map((kpi, idx) => (
               <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                 <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{kpi.title}</p>
                 <h4 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                   {formatKPIValue(kpi.value, kpi.format)}
                 </h4>
                 {kpi.type === 'top-value' ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 w-max px-2.5 py-1 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Represents {kpi.badgePercentage}% of valid records
                    </div>
                 ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 w-max px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Grand Total
                    </div>
                 )}
               </div>
             ))}
           </div>

           {/* Charts Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {dashboardData.charts.map((chart) => (
               <div key={chart.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                 <h3 className="text-sm font-bold tracking-wide text-slate-700 dark:text-slate-300 mb-6 uppercase flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500" />
                   {chart.title}
                 </h3>
                 <div className="relative z-10 -ml-4">
                   {renderChart(chart)}
                 </div>
               </div>
             ))}
             {dashboardData.charts.length === 0 && (
                <div className="col-span-2 text-center p-8 text-slate-500 border border-dashed rounded-xl border-slate-300">
                  Insufficient data quality to generate charts.
                </div>
             )}
           </div>
           
        </div>
      )}
    </div>
  )
}
