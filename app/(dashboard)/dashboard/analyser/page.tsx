'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Loader2, Download, Table, LayoutDashboard, Mail, HelpCircle } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import { processDataPipeline, PipelineResult } from '@/lib/dataPipeline'
import { generateDashboardAggregates, AggregatedDashboardData, ChartConfig } from '@/lib/dashboardAggregator'
import { generateExecutiveInsight } from '@/app/actions/dashboard'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart
} from 'recharts'
import { useDashboardStore } from '@/lib/store/useDashboardStore'

type AppStep = 'UPLOAD' | 'TABLE' | 'DASHBOARD'

const LOADING_STEPS = [
  "Analyzing data patterns...",
  "Structuring key findings from the data...",
  "Identifying trends...",
  "Summarizing insights...",
  "Compiling recommendation..."
]

export const maxDuration = 60

const OREATE_COLORS = ['#2c5555', '#d9a05b', '#4c7286', '#8c9296', '#526D82', '#9DB2BF'];

export default function DataAnalyserPage() {
  const [step, setStep] = useState<AppStep>('UPLOAD')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0])
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [rawPipelineResult, setRawPipelineResult] = useState<PipelineResult | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  
  const [dashboardData, setDashboardData] = useState<AggregatedDashboardData | null>(null)
  const [aiData, setAiData] = useState<{ headline: string, subheadline: string, chartInsights: Record<string, string> } | null>(null)
  
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingForPDF, setIsExportingForPDF] = useState(false)
  
  const { selectedYears, selectedMonths, toggleYear, toggleMonth, clearFilters } = useDashboardStore()

  useEffect(() => {
    if (rawPipelineResult && step === 'DASHBOARD') {
      const aggregates = generateDashboardAggregates(rawPipelineResult, selectedYears, selectedMonths)
      setDashboardData(aggregates)
      
      if (!aiData && !isGenerating) {
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
      
      dashboardRef.current.style.width = '1200px'
      dashboardRef.current.style.maxWidth = '1200px'
      
      void dashboardRef.current.offsetHeight
      
      const imgData = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#fcfcfc' })
      
      dashboardRef.current.style.width = originalWidth
      dashboardRef.current.style.maxWidth = originalMaxWidth

      const link = document.createElement('a')
      link.href = imgData
      link.download = `sovira-editorial-dashboard-${new Date().toISOString().split('T')[0]}.png`
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
    setAiData(null)
    clearFilters()
    
    // Start automated loading sequence
    let currentStep = 0;
    setLoadingText(LOADING_STEPS[0]);
    const loadingInterval = setInterval(() => {
       currentStep = (currentStep + 1) % LOADING_STEPS.length;
       setLoadingText(LOADING_STEPS[currentStep]);
    }, 600);

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
          clearInterval(loadingInterval)
          toast.error("This file contains macros, which we don't support for security reasons.")
          setIsParsing(false)
          return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: null })
      }

      if (parsedData.length === 0) {
        clearInterval(loadingInterval)
        toast.error('The file appears to be empty.')
        setIsParsing(false)
        return
      }

      setRawData(parsedData)
      const pipelineResult = processDataPipeline(parsedData)
      setRawPipelineResult(pipelineResult)
      
      // Artificial delay to let the user see the "smart" loading sequence
      await new Promise(r => setTimeout(r, 3500))
      
      clearInterval(loadingInterval)
      toast.success('Data automatically cleaned & structured!')
      setIsParsing(false)
      setStep('TABLE')

    } catch (err: any) {
      clearInterval(loadingInterval)
      toast.error(`Failed to read file: ${err.message}`)
      setIsParsing(false)
    }
  }

  const generateAIInsight = async (aggregates: AggregatedDashboardData) => {
    setIsGenerating(true)
    try {
      const res = await generateExecutiveInsight(aggregates.aiInsightContext)
      if (res.success && res.insight) {
        setAiData(res.insight)
      } else {
        console.error("AI Error:", res.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderMatrix = (chartSpec: ChartConfig) => {
    if (!chartSpec.data || chartSpec.data.length === 0) return null;
    const { categoryKey: dim1, dataKey2: dim2, dataKey } = chartSpec;
    
    const uniqueD1 = Array.from(new Set(chartSpec.data.map(d => d[dim1]))).filter(Boolean);
    const uniqueD2 = Array.from(new Set(chartSpec.data.map(d => d[dim2!]))).filter(Boolean);
    
    const maxVal = Math.max(...chartSpec.data.map(d => d[dataKey] || 0));

    return (
      <div className="w-full overflow-x-auto text-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left font-serif text-slate-500 border-b border-slate-200"></th>
              {uniqueD2.map((d2: any, i) => (
                <th key={i} className="p-2 text-center font-serif text-slate-500 border-b border-slate-200">{d2}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueD1.map((d1: any, i) => (
              <tr key={i}>
                <td className="p-2 font-serif text-slate-700 border-b border-slate-100">{d1}</td>
                {uniqueD2.map((d2: any, j) => {
                  const cellData = chartSpec.data.find(d => d[dim1] === d1 && d[dim2!] === d2);
                  const val = cellData ? cellData[dataKey] : 0;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  
                  // Oreate teal heatmap colors
                  let bg = 'transparent';
                  let color = '#475569';
                  if (intensity > 0.8) { bg = '#2c5555'; color = '#fff'; }
                  else if (intensity > 0.5) { bg = '#4c7286'; color = '#fff'; }
                  else if (intensity > 0.2) { bg = '#9DB2BF'; color = '#1e293b'; }
                  else if (intensity > 0) { bg = '#e2e8f0'; color = '#475569'; }

                  return (
                    <td key={j} className="p-1 border-b border-slate-100">
                      <div style={{ backgroundColor: bg, color }} className="w-full h-full p-2 text-center rounded text-xs transition-colors">
                         {val > 0 ? (val > 1000 ? (val/1000).toFixed(1)+'k' : val.toLocaleString()) : '-'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderChart = (chartSpec: ChartConfig) => {
    const commonTooltipStyle = {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      color: '#1e293b',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      fontFamily: 'serif'
    };
    const commonAxisStyle = { stroke: '#cbd5e1', fontSize: 11, tickLine: false, axisLine: false, fontFamily: 'sans-serif' };
    const commonGridStyle = { stroke: '#f1f5f9', strokeDasharray: '3 3', vertical: false };

    if (chartSpec.type === 'donut') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartSpec.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="total"
              nameKey={chartSpec.categoryKey}
              isAnimationActive={!isExportingForPDF}
            >
              {chartSpec.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={OREATE_COLORS[index % OREATE_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip contentStyle={commonTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', fontFamily: 'serif' }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'heatmap') {
      return renderMatrix(chartSpec);
    }

    if (chartSpec.type === 'combo') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartSpec.data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis yAxisId="left" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            {chartSpec.dataKey2 && <YAxis yAxisId="right" orientation="right" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />}
            <Tooltip contentStyle={commonTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', fontFamily: 'serif', marginTop: '10px' }} />
            <Bar isAnimationActive={!isExportingForPDF} yAxisId="left" dataKey={chartSpec.dataKey} fill="#2c5555" barSize={30} />
            {chartSpec.dataKey2 ? (
              <Line isAnimationActive={!isExportingForPDF} yAxisId="right" type="monotone" dataKey={chartSpec.dataKey2} stroke="#d9a05b" strokeWidth={2} dot={{ r: 4, fill: '#fff', stroke: '#d9a05b', strokeWidth: 2 }} />
            ) : (
               <Line isAnimationActive={!isExportingForPDF} yAxisId="left" type="monotone" dataKey={chartSpec.dataKey} stroke="#d9a05b" strokeWidth={2} dot={{ r: 4, fill: '#fff', stroke: '#d9a05b', strokeWidth: 2 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'bar') {
      const isHorizontal = chartSpec.orientation === 'horizontal';
      return (
        <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(240, chartSpec.data.length * 30) : 240}>
          <BarChart 
            data={chartSpec.data.slice(0, isHorizontal ? 20 : 15)} 
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 20, left: isHorizontal ? 20 : -20, bottom: 0 }}
          >
            <CartesianGrid {...commonGridStyle} horizontal={!isHorizontal} vertical={isHorizontal} />
            {isHorizontal ? (
              <>
                <XAxis type="number" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
                <YAxis type="category" dataKey={chartSpec.categoryKey} {...commonAxisStyle} width={80} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'serif' }} />
              </>
            ) : (
              <>
                <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
              </>
            )}
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={commonTooltipStyle} />
            <Bar isAnimationActive={!isExportingForPDF} dataKey={chartSpec.dataKey} fill="#4c7286" barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} />
            <Tooltip contentStyle={commonTooltipStyle} />
            <Line isAnimationActive={!isExportingForPDF} type="monotone" dataKey={chartSpec.dataKey} stroke="#2c5555" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#2c5555', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#2c5555', stroke: '#fff' }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  const formatKPIValue = (value: any, format: string) => {
    if (format === 'currency') {
      if (Number(value) > 1000000) return '$' + (Number(value) / 1000000).toFixed(2) + 'M';
      if (Number(value) > 1000) return '$' + (Number(value) / 1000).toFixed(1) + 'K';
      return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    if (format === 'percent') {
      return Number(value).toFixed(1) + '%'
    }
    if (format === 'number') {
      if (Number(value) > 1000000) return (Number(value) / 1000000).toFixed(2) + 'M';
      if (Number(value) > 1000) return (Number(value) / 1000).toFixed(1) + 'K';
      return Number(value).toLocaleString()
    }
    return String(value)
  }

  return (
    <div className="bg-[#fcfcfc] min-h-screen text-slate-800 font-sans flex h-screen overflow-hidden">
      
      {/* Sidebar - Oreate Editorial Style */}
      <div className="w-16 bg-[#ffffff] border-r border-slate-200 shrink-0 flex flex-col items-center py-6 gap-8 z-10">
         <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-orange-500 block"></span>
         </div>
         <nav className="flex flex-col gap-6 w-full items-center mt-4">
            <button onClick={() => setStep('UPLOAD')} className={`p-2 rounded-md transition-colors ${step === 'UPLOAD' ? 'text-slate-800 bg-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
               <Upload className="w-5 h-5" />
            </button>
            <button onClick={() => rawData.length > 0 && setStep('TABLE')} disabled={rawData.length === 0} className={`p-2 rounded-md transition-colors ${step === 'TABLE' ? 'text-slate-800 bg-slate-100' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
               <Table className="w-5 h-5" />
            </button>
            <button onClick={() => dashboardData && setStep('DASHBOARD')} disabled={!dashboardData} className={`p-2 rounded-md transition-colors ${step === 'DASHBOARD' ? 'text-slate-800 bg-slate-100' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
               <LayoutDashboard className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-md text-slate-400 hover:text-slate-600 transition-colors mt-auto">
               <Mail className="w-5 h-5" />
            </button>
         </nav>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {step === 'UPLOAD' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div 
              className={`border-2 border-dashed rounded-xl p-16 text-center transition-all max-w-2xl w-full ${
                isDragging 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-slate-300 hover:border-slate-400 bg-white'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-6" />
              <h3 className="text-2xl font-serif text-slate-800 mb-2">Upload your dataset</h3>
              <p className="text-slate-500 text-sm mb-8 font-serif">Supports CSV, Excel, TXT up to 10MB</p>
              
              <label className="bg-[#2c5555] hover:bg-[#204040] text-white px-8 py-3 rounded text-sm font-semibold tracking-wide cursor-pointer transition-all inline-flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" />
                Select File
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {isParsing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-teal-700 z-50 transition-all duration-500">
                 <Loader2 className="w-12 h-12 animate-spin mb-6 text-[#2c5555]" />
                 <h2 className="font-serif text-2xl font-medium text-[#1e293b] mb-2">Processing Data</h2>
                 <p className="font-serif italic text-[#4c7286] text-lg animate-pulse">{loadingText}</p>
              </div>
            )}
          </div>
        )}

        {step === 'TABLE' && rawData.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#fcfcfc]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
               <div>
                 <h2 className="text-2xl font-serif text-slate-800 tracking-tight">Data Cleansed & Structured</h2>
                 <p className="text-sm text-slate-500 font-serif italic mt-1">Our AI has automatically formatted and mapped your raw data.</p>
               </div>
               <button 
                  onClick={() => setStep('DASHBOARD')}
                  className="bg-[#2c5555] hover:bg-[#204040] text-white px-6 py-2.5 rounded text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
               >
                  Generate Smart Dashboard
               </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
               <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                           <tr>
                              {Object.keys(rawData[0] || {}).map((key) => (
                                 <th key={key} scope="col" className="px-6 py-3 font-semibold whitespace-nowrap">
                                    {key}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody>
                           {rawData.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                 {Object.values(row).map((val: any, jdx) => (
                                    <td key={jdx} className="px-6 py-4 whitespace-nowrap text-slate-700">
                                       {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">null</span>}
                                    </td>
                                 ))}
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  {rawData.length > 50 && (
                     <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-serif italic">
                        Showing first 50 rows of {rawData.length} total rows.
                     </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {step === 'DASHBOARD' && dashboardData && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[#fcfcfc]" ref={dashboardRef}>
            
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
               
               {/* Editorial Header */}
               <div className="flex flex-col gap-4 border-b border-slate-200 pb-8 relative">
                  <div className="absolute right-0 top-0 flex gap-3">
                     <button
                        onClick={handleExportPNG}
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-semibold rounded hover:bg-slate-50 transition-all"
                     >
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Export
                     </button>
                  </div>
                  
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">
                     ANNUAL PERFORMANCE REVIEW
                  </div>
                  
                  {isGenerating || !aiData ? (
                     <div className="animate-pulse flex flex-col gap-4">
                        <div className="h-10 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-6 bg-slate-100 rounded w-1/2"></div>
                     </div>
                  ) : (
                     <>
                        <h1 className="text-4xl lg:text-5xl font-serif text-[#1e293b] leading-tight tracking-tight max-w-4xl">
                           {aiData.headline}
                        </h1>
                        <p className="text-lg text-slate-500 font-serif italic max-w-3xl leading-relaxed">
                           {aiData.subheadline}
                        </p>
                     </>
                  )}
               </div>

               {/* Oreate Minimalist KPIs */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {dashboardData.kpis.map((kpi, idx) => (
                   <div key={idx} className="bg-white border border-slate-100 rounded-lg p-6 shadow-sm flex flex-col gap-3">
                     <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        {kpi.title}
                     </span>
                     <div className="text-3xl font-serif text-[#1e293b] font-medium tracking-tight">
                        {formatKPIValue(kpi.value, kpi.format)}
                     </div>
                     <span className="text-xs text-slate-400 font-serif italic border-t border-slate-100 pt-3">
                        {kpi.subtitle}
                     </span>
                   </div>
                 ))}
               </div>

               {/* Dynamic Masonry Chart Grid matching Oreate Style */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {dashboardData.charts.map((chart, index) => {
                     let wrapperClass = "bg-white border border-slate-100 rounded-xl p-8 shadow-sm flex flex-col gap-6";
                     if (chart.type === 'combo' || chart.id.includes('combo') || index === dashboardData.charts.length - 1) {
                        wrapperClass += " col-span-1 lg:col-span-2"; 
                     } else {
                        wrapperClass += " col-span-1";
                     }

                     const insightText = aiData?.chartInsights?.[chart.id];

                     return (
                        <div key={chart.id} className={wrapperClass}>
                           <div className="flex flex-col gap-1">
                              <h3 className="text-lg font-serif text-[#1e293b] font-medium">{chart.title}</h3>
                              <p className="text-xs text-slate-400 font-serif italic border-b border-slate-100 pb-4">
                                 Breakdown by {chart.categoryKey.replace(/_/g, ' ')}
                              </p>
                           </div>
                           
                           <div className="w-full relative mt-2">
                              {renderChart(chart)}
                           </div>
                           
                           {/* Per-Chart AI Insight Block */}
                           <div className="mt-4 pt-4 border-t border-slate-100">
                              {isGenerating || !aiData ? (
                                 <div className="animate-pulse flex flex-col gap-2">
                                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                                 </div>
                              ) : (
                                 <p className="text-xs text-slate-600 font-serif leading-relaxed">
                                    <strong className="text-slate-800">Insight:</strong> {insightText || 'No specific insight available for this metric.'}
                                 </p>
                              )}
                           </div>
                        </div>
                     )
                  })}
               </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
