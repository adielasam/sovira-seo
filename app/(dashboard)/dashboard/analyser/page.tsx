'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileSpreadsheet, Loader2, Download, FileText, CheckCircle2, ChevronRight, PieChart as PieChartIcon } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { processDataPipeline, PipelineResult } from '@/lib/dataPipeline'
import { generateDashboardAggregates, AggregatedDashboardData, ChartConfig } from '@/lib/dashboardAggregator'
import { generateExecutiveInsight } from '@/app/actions/dashboard'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useDashboardStore } from '@/lib/store/useDashboardStore'

export const maxDuration = 60

const PIE_COLORS = ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

export default function DataAnalyserPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [rawPipelineResult, setRawPipelineResult] = useState<PipelineResult | null>(null)
  const [dashboardData, setDashboardData] = useState<AggregatedDashboardData | null>(null)
  const [executiveInsight, setExecutiveInsight] = useState<string | null>(null)
  
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingForPDF, setIsExportingForPDF] = useState(false)
  
  const { selectedYears, selectedMonths, toggleYear, toggleMonth, clearFilters } = useDashboardStore()

  // Whenever the raw pipeline result OR the selected filters change, re-aggregate the dashboard
  useEffect(() => {
    if (rawPipelineResult) {
      const aggregates = generateDashboardAggregates(rawPipelineResult, selectedYears, selectedMonths)
      setDashboardData(aggregates)
      
      // If we just loaded the file and haven't fetched insight yet
      if (!executiveInsight && !isGenerating) {
        generateAIInsight(aggregates)
      }
    }
  }, [rawPipelineResult, selectedYears, selectedMonths])

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    setIsExportingForPDF(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const originalWidth = dashboardRef.current.style.width
      const originalMaxWidth = dashboardRef.current.style.maxWidth
      const originalBg = dashboardRef.current.style.backgroundColor
      
      dashboardRef.current.style.width = '1400px'
      dashboardRef.current.style.maxWidth = '1400px'
      dashboardRef.current.style.backgroundColor = '#0a0a0a' // dark bg
      
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
      
      dashboardRef.current.style.width = '1400px'
      dashboardRef.current.style.maxWidth = '1400px'
      dashboardRef.current.style.backgroundColor = '#0a0a0a'
      
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
      toast.error('File size exceeds 10MB limit.')
      return
    }

    const fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const fileType = file.type.toLowerCase();

    setIsParsing(true)
    setRawPipelineResult(null)
    setDashboardData(null)
    setExecutiveInsight(null)
    clearFilters() // reset slicers

    try {
      let rawData: any[] = []
      if (['csv', 'tsv', 'txt'].includes(fileExt || '') || fileType.includes('csv') || fileType.includes('text')) {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
        rawData = parsed.data
      } else {
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

      // Phase 1 + 2 Pipeline execution
      const pipelineResult = processDataPipeline(rawData)
      setRawPipelineResult(pipelineResult) // This will trigger the useEffect to generate aggregates
      
      toast.success('Data successfully analyzed!')
      setIsParsing(false)

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
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderChart = (chartSpec: ChartConfig) => {
    const commonTooltipStyle = {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid #374151',
      borderRadius: '8px',
      color: '#f9fafb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    };
    const commonAxisStyle = { stroke: '#6b7280', fontSize: 11, tickLine: false, axisLine: false };
    const commonGridStyle = { stroke: '#374151', strokeDasharray: '3 3', vertical: false };

    if (chartSpec.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartSpec.data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="total"
              nameKey={chartSpec.categoryKey}
              isAnimationActive={!isExportingForPDF}
            >
              {chartSpec.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip contentStyle={commonTooltipStyle} itemStyle={{ color: '#fff' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#d1d5db' }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'bar') {
      const isHorizontal = chartSpec.orientation === 'horizontal';
      return (
        <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(300, chartSpec.data.length * 30) : 260}>
          <BarChart 
            data={chartSpec.data.slice(0, isHorizontal ? 50 : 15)} 
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 20, left: isHorizontal ? 20 : -20, bottom: 0 }}
          >
            <CartesianGrid {...commonGridStyle} horizontal={!isHorizontal} vertical={isHorizontal} />
            {isHorizontal ? (
              <>
                <XAxis type="number" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
                <YAxis type="category" dataKey={chartSpec.categoryKey} {...commonAxisStyle} width={80} tick={{ fill: '#d1d5db', fontSize: 10 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#d1d5db', fontSize: 10 }} />
                <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
              </>
            )}
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={commonTooltipStyle} />
            <Bar isAnimationActive={!isExportingForPDF} dataKey={chartSpec.dataKey} fill="#ef4444" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#d1d5db', fontSize: 10 }} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip contentStyle={commonTooltipStyle} />
            <Line isAnimationActive={!isExportingForPDF} type="monotone" dataKey={chartSpec.dataKey} stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#111827', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff' }} />
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

  const monthsMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-300 pb-20 font-sans transition-colors duration-500 overflow-x-hidden">
      
      {/* Top Header Bar */}
      <div className="bg-[#111] border-b border-[#222] p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
          <span className="bg-red-600 text-white p-1.5 rounded flex items-center justify-center">
            <PieChartIcon className="w-5 h-5" />
          </span>
          YOUTUBE-STYLE ANALYTICS DASHBOARD
        </h1>
        {dashboardData && (
          <div className="flex items-center gap-3">
             <button
               onClick={handleExportPNG}
               disabled={isExporting}
               className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-red-500 hover:text-red-400 text-white text-sm font-semibold rounded shadow-sm transition-all disabled:opacity-50"
             >
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
               Export Image
             </button>
             <button 
                onClick={() => { setRawPipelineResult(null); setDashboardData(null); setExecutiveInsight(null); clearFilters(); }}
                className="text-xs font-bold uppercase tracking-wider text-[#888] hover:text-white bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded shadow-sm transition-all"
             >
                Close Data
             </button>
          </div>
        )}
      </div>

      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Upload State */}
        {!rawPipelineResult && !isParsing && (
          <div 
            className={`border-2 border-dashed rounded-xl p-16 text-center transition-all max-w-2xl mx-auto mt-20 ${
              isDragging 
                ? 'border-red-500 bg-red-900/10' 
                : 'border-[#333] hover:border-[#555] bg-[#111]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <PieChartIcon className="w-16 h-16 text-[#444] mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Drag and drop your dataset</h3>
            <p className="text-[#888] text-sm mb-8">Supports any tabular data file (CSV, Excel, TXT) up to 10MB</p>
            
            <label className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded text-sm font-bold tracking-wide cursor-pointer transition-all inline-flex items-center gap-2 shadow-lg shadow-red-900/20">
              <Upload className="w-4 h-4" />
              BROWSE FILES
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {isParsing && (
          <div className="bg-[#111] border border-[#222] p-16 rounded flex flex-col items-center justify-center min-h-[400px] max-w-2xl mx-auto mt-20">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-6" />
            <h2 className="text-xl font-bold text-white mb-2 tracking-wide">
              PROCESSING DATA...
            </h2>
            <p className="text-[#666]">Detecting schema, compiling macros, parsing rows.</p>
          </div>
        )}

        {/* Dashboard Layout */}
        {dashboardData && (
          <div ref={dashboardRef} className="flex flex-col lg:flex-row gap-4 animate-in fade-in duration-1000">
             
             {/* Left Sidebar (Slicers) */}
             <div className="lg:w-48 shrink-0 flex flex-col gap-4">
                
                {/* Year Slicer */}
                {dashboardData.availableYears.length > 0 && (
                  <div className="bg-[#111] border border-[#222] rounded overflow-hidden shadow-md">
                    <div className="bg-[#151515] border-b border-[#222] px-3 py-2 text-xs font-bold tracking-widest text-[#666] flex justify-between items-center">
                      YEARS
                      {selectedYears.size > 0 && <span className="text-red-500 cursor-pointer hover:text-red-400" onClick={clearFilters}>CLEAR</span>}
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {dashboardData.availableYears.map(yr => (
                        <button 
                          key={yr} 
                          onClick={() => toggleYear(yr)}
                          className={`px-3 py-1.5 rounded text-left text-sm font-medium transition-colors ${
                            selectedYears.has(yr) 
                              ? 'bg-red-600 text-white shadow-inner shadow-red-800' 
                              : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#888] hover:text-white border border-[#222]'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Month Slicer */}
                {dashboardData.availableMonths.length > 0 && (
                  <div className="bg-[#111] border border-[#222] rounded overflow-hidden shadow-md">
                    <div className="bg-[#151515] border-b border-[#222] px-3 py-2 text-xs font-bold tracking-widest text-[#666]">
                      MONTHS
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {dashboardData.availableMonths.map(mo => (
                        <button 
                          key={mo} 
                          onClick={() => toggleMonth(mo)}
                          className={`px-3 py-1.5 rounded text-left text-sm font-medium transition-colors ${
                            selectedMonths.has(mo) 
                              ? 'bg-red-600 text-white shadow-inner shadow-red-800' 
                              : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#888] hover:text-white border border-[#222]'
                          }`}
                        >
                          {monthsMap[mo - 1] || mo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

             </div>

             {/* Main Content Area */}
             <div className="flex-1 flex flex-col gap-4">
                
                {/* Top KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {dashboardData.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-[#451111] to-[#250b0b] border border-[#551a1a] rounded p-4 shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden group min-h-[90px]">
                      <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center gap-1.5 text-red-200/80 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-80 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                        {kpi.title}
                      </div>
                      <h4 className="text-xl xl:text-2xl font-black text-white tracking-tight drop-shadow-md">
                        {formatKPIValue(kpi.value, kpi.format)}
                      </h4>
                    </div>
                  ))}
                </div>

                {/* Charts Grid - Masonry style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.charts.map((chart, idx) => {
                    // Determine grid spans based on chart type and index to mimic the reference dashboard layout
                    let spanClass = 'col-span-1';
                    if (chart.type === 'line') spanClass = 'col-span-1 md:col-span-2 lg:col-span-2';
                    if (chart.orientation === 'horizontal') spanClass = 'col-span-1 md:col-span-2 lg:col-span-1 lg:row-span-2';
                    
                    return (
                      <div key={chart.id} className={`bg-[#111] border border-[#222] rounded p-4 shadow-xl flex flex-col ${spanClass}`}>
                        <h3 className="text-[11px] font-bold tracking-widest text-[#ccc] mb-4 text-center border-b border-[#222] pb-3 uppercase">
                          {chart.title}
                        </h3>
                        <div className="flex-1 w-full flex items-center justify-center relative -ml-2">
                          {renderChart(chart)}
                        </div>
                      </div>
                    )
                  })}
                  
                  {dashboardData.charts.length === 0 && (
                      <div className="col-span-full text-center p-12 text-[#555] border border-dashed rounded border-[#333]">
                        Insufficient data matching the selected filters.
                      </div>
                  )}
                </div>
                
             </div>
          </div>
        )}
      </div>
    </div>
  )
}
