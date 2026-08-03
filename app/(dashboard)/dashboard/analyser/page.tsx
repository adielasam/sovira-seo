'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Loader2, Download, PieChart as PieChartIcon, LayoutDashboard, Table, Mail, HelpCircle } from 'lucide-react'
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
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { useDashboardStore } from '@/lib/store/useDashboardStore'

// @ts-ignore
import PivotTableUI from 'react-pivottable/PivotTableUI'
import 'react-pivottable/pivottable.css'

export const maxDuration = 60

const PIE_COLORS = ['#eb5f28', '#2a5b9b', '#f9c80e', '#43b929', '#f87171', '#60a5fa'];

type AppStep = 'UPLOAD' | 'PIVOT' | 'DASHBOARD'

export default function DataAnalyserPage() {
  const [step, setStep] = useState<AppStep>('UPLOAD')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [rawPipelineResult, setRawPipelineResult] = useState<PipelineResult | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  
  // Pivot Table State
  const [pivotState, setPivotState] = useState({})
  
  const [dashboardData, setDashboardData] = useState<AggregatedDashboardData | null>(null)
  const [executiveInsight, setExecutiveInsight] = useState<string | null>(null)
  
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingForPDF, setIsExportingForPDF] = useState(false)
  
  const { selectedYears, selectedMonths, toggleYear, toggleMonth, clearFilters } = useDashboardStore()

  useEffect(() => {
    if (rawPipelineResult && step === 'DASHBOARD') {
      const aggregates = generateDashboardAggregates(rawPipelineResult, selectedYears, selectedMonths)
      setDashboardData(aggregates)
      
      if (!executiveInsight && !isGenerating) {
        generateAIInsight(aggregates)
      }
    }
  }, [rawPipelineResult, selectedYears, selectedMonths, step])

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    setIsExportingForPDF(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const originalWidth = dashboardRef.current.style.width
      const originalMaxWidth = dashboardRef.current.style.maxWidth
      
      dashboardRef.current.style.width = '1400px'
      dashboardRef.current.style.maxWidth = '1400px'
      
      void dashboardRef.current.offsetHeight
      
      const imgData = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#f8fafc' })
      
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
    clearFilters()

    try {
      let parsedData: any[] = []
      if (['csv', 'tsv', 'txt'].includes(fileExt || '') || fileType.includes('csv') || fileType.includes('text')) {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
        parsedData = parsed.data
      } else {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', bookVBA: true })
        
        if (workbook.vbaraw) {
          toast.error("This file contains macros, which we don't support for security reasons.")
          setIsParsing(false)
          return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: null })
      }

      if (parsedData.length === 0) {
        toast.error('The file appears to be empty.')
        setIsParsing(false)
        return
      }

      setRawData(parsedData)
      const pipelineResult = processDataPipeline(parsedData)
      setRawPipelineResult(pipelineResult)
      
      toast.success('Data successfully analyzed!')
      setIsParsing(false)
      setStep('PIVOT')

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
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      color: '#1e293b',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    };
    const commonAxisStyle = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false };
    const commonGridStyle = { stroke: '#e2e8f0', strokeDasharray: '3 3', vertical: false };

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
            <Tooltip contentStyle={commonTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartSpec.data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey={chartSpec.categoryKey} tick={{ fill: '#475569', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={['auto', 'auto']} tick={false} axisLine={false} />
            <Radar name={chartSpec.title} dataKey="total" stroke="#2a5b9b" fill="#2a5b9b" fillOpacity={0.4} isAnimationActive={!isExportingForPDF} />
            <Tooltip contentStyle={commonTooltipStyle} />
          </RadarChart>
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
                <YAxis type="category" dataKey={chartSpec.categoryKey} {...commonAxisStyle} width={80} tick={{ fill: '#475569', fontSize: 10 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
              </>
            )}
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={commonTooltipStyle} />
            <Bar isAnimationActive={!isExportingForPDF} dataKey="total" fill="#2a5b9b" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#475569', fontSize: 10 }} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip contentStyle={commonTooltipStyle} />
            <Line isAnimationActive={!isExportingForPDF} type="monotone" dataKey="total" stroke="#991b1b" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#991b1b', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#991b1b', stroke: '#fff' }} />
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
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans flex h-screen overflow-hidden">
      
      {/* Sidebar - McDonald's Style */}
      <div className="w-16 bg-[#0a2540] shrink-0 flex flex-col items-center py-6 gap-8 z-10 shadow-xl">
         <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-black text-white text-xl shadow-lg">
           S
         </div>
         <nav className="flex flex-col gap-6 w-full items-center mt-4">
            <button onClick={() => setStep('UPLOAD')} className={`p-2 rounded-md transition-colors ${step === 'UPLOAD' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
               <Upload className="w-6 h-6" />
            </button>
            <button onClick={() => rawData.length > 0 && setStep('PIVOT')} disabled={rawData.length === 0} className={`p-2 rounded-md transition-colors ${step === 'PIVOT' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30'}`}>
               <Table className="w-6 h-6" />
            </button>
            <button onClick={() => dashboardData && setStep('DASHBOARD')} disabled={!dashboardData} className={`p-2 rounded-md transition-colors ${step === 'DASHBOARD' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30'}`}>
               <LayoutDashboard className="w-6 h-6" />
            </button>
            <button className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors mt-auto">
               <Mail className="w-6 h-6" />
            </button>
            <button className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors">
               <HelpCircle className="w-6 h-6" />
            </button>
         </nav>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Upload State */}
        {step === 'UPLOAD' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div 
              className={`border-2 border-dashed rounded-xl p-16 text-center transition-all max-w-2xl mx-auto mt-20 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PieChartIcon className="w-16 h-16 text-slate-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Drag and drop your dataset</h3>
              <p className="text-slate-500 text-sm mb-8">Supports any tabular data file (CSV, Excel, TXT) up to 10MB</p>
              
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-sm font-bold tracking-wide cursor-pointer transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-900/20">
                <Upload className="w-4 h-4" />
                BROWSE FILES
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {isParsing && (
              <div className="text-center mt-8 flex flex-col items-center text-blue-600">
                 <Loader2 className="w-8 h-8 animate-spin mb-2" />
                 <p className="font-medium">Processing Data...</p>
              </div>
            )}
          </div>
        )}

        {/* Pivot Table Step */}
        {step === 'PIVOT' && rawData.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shadow-sm z-10">
               <div>
                 <h2 className="text-xl font-bold text-slate-800">Data Cleanup & Pivot</h2>
                 <p className="text-xs text-slate-500">Explore and shape your data before generating the dashboard.</p>
               </div>
               <button 
                  onClick={() => setStep('DASHBOARD')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-bold text-sm shadow-md transition-colors flex items-center gap-2"
               >
                  Generate Smart Dashboard
                  <LayoutDashboard className="w-4 h-4" />
               </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
               <PivotTableUI
                  data={rawData}
                  onChange={(s: any) => setPivotState(s)}
                  {...pivotState}
               />
            </div>
          </div>
        )}

        {/* Dashboard Step */}
        {step === 'DASHBOARD' && dashboardData && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50" ref={dashboardRef}>
            
            {/* Top Header Bar */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                 <h1 className="text-2xl font-bold text-[#0a2540] tracking-tight">
                   {dashboardData.title}
                 </h1>
                 <p className="text-xs text-slate-500 italic mt-1">Figures dynamically generated by AI</p>
              </div>
              <div className="flex items-center gap-3">
                 <button
                   onClick={handleExportPNG}
                   disabled={isExporting}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 text-sm font-semibold rounded shadow-sm transition-all disabled:opacity-50"
                 >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                   Export Image
                 </button>
                 <button 
                    onClick={() => { setStep('UPLOAD'); setRawPipelineResult(null); setRawData([]); setDashboardData(null); clearFilters(); }}
                    className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-rose-600 border border-slate-200 px-4 py-2 rounded shadow-sm transition-all"
                 >
                    Close Data
                 </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
               
               {/* KPI Row (Now wrapped in flex to sit next to slicers if needed, or top row) */}
               <div className="flex-1 flex flex-col gap-6">
                  
                  {/* Top KPIs Row - Light Theme with Radial Rings */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {dashboardData.kpis.map((kpi, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-2 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-1">
                           <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                             {kpi.title}
                           </span>
                           <h4 className="text-xl xl:text-2xl font-black text-[#0a2540] tracking-tight">
                             {formatKPIValue(kpi.value, kpi.format)}
                           </h4>
                        </div>
                        {/* Small Radial Progress Ring */}
                        <div className="w-12 h-12 relative shrink-0">
                           <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                               <Pie
                                 data={[{ value: kpi.badgePercentage }, { value: 100 - kpi.badgePercentage }]}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius="65%"
                                 outerRadius="100%"
                                 startAngle={90}
                                 endAngle={-270}
                                 dataKey="value"
                                 stroke="none"
                               >
                                 <Cell fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                 <Cell fill="#f1f5f9" />
                               </Pie>
                             </PieChart>
                           </ResponsiveContainer>
                           <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                             {kpi.badgePercentage}%
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Layout Grid */}
                  <div className="flex flex-col lg:flex-row gap-6">
                     
                     {/* Left Sidebar (Slicers) - Now integrated into the layout */}
                     <div className="w-full lg:w-48 shrink-0 flex flex-col gap-4">
                        
                        {dashboardData.availableYears.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-bold tracking-widest text-[#0a2540] flex justify-between items-center">
                              YEARS
                              {selectedYears.size > 0 && <span className="text-rose-500 cursor-pointer hover:text-rose-600 text-[10px]" onClick={clearFilters}>CLEAR</span>}
                            </div>
                            <div className="p-2 flex flex-col gap-1">
                              {dashboardData.availableYears.map(yr => (
                                <button 
                                  key={yr} 
                                  onClick={() => toggleYear(yr)}
                                  className={`px-3 py-2 rounded-md text-left text-sm font-semibold transition-colors ${
                                    selectedYears.has(yr) 
                                      ? 'bg-[#0a2540] text-white' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200'
                                  }`}
                                >
                                  {yr}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {dashboardData.availableMonths.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-bold tracking-widest text-[#0a2540]">
                              MONTHS
                            </div>
                            <div className="p-2 flex flex-col gap-1">
                              {dashboardData.availableMonths.map(mo => (
                                <button 
                                  key={mo} 
                                  onClick={() => toggleMonth(mo)}
                                  className={`px-3 py-2 rounded-md text-left text-sm font-semibold transition-colors ${
                                    selectedMonths.has(mo) 
                                      ? 'bg-[#0a2540] text-white' 
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200'
                                  }`}
                                >
                                  {monthsMap[mo - 1] || mo}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-auto">
                           <h3 className="text-[10px] font-black tracking-widest text-blue-800 mb-2">AI INSIGHT</h3>
                           {isGenerating ? (
                              <div className="flex items-center gap-2 text-blue-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-xs">Analyzing...</span>
                              </div>
                            ) : (
                              <p className="text-xs text-blue-900 font-medium leading-relaxed">
                                {executiveInsight || "Upload more complex data for AI insights."}
                              </p>
                            )}
                        </div>

                     </div>

                     {/* Main Charts Area */}
                     <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {dashboardData.charts.map((chart, idx) => {
                          let spanClass = 'col-span-1';
                          if (chart.type === 'line' || chart.orientation === 'horizontal') spanClass = 'col-span-1 lg:col-span-2';
                          
                          return (
                            <div key={chart.id} className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col ${spanClass}`}>
                              <h3 className="text-sm font-bold text-[#0a2540] mb-6 border-b border-slate-100 pb-2">
                                {chart.title}
                              </h3>
                              <div className="flex-1 w-full flex items-center justify-center relative -ml-2">
                                {renderChart(chart)}
                              </div>
                            </div>
                          )
                        })}
                        
                        {dashboardData.charts.length === 0 && (
                            <div className="col-span-full text-center p-12 text-slate-400 border-2 border-dashed rounded-xl border-slate-200">
                              No charts available for the selected data slice.
                            </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
