'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Loader2, Download, Table, LayoutDashboard, Mail, HelpCircle, Palette, CheckCircle2 } from 'lucide-react'
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
import { DASHBOARD_THEMES, DashboardTheme } from '@/lib/themes'

type AppStep = 'UPLOAD' | 'TABLE' | 'THEMES' | 'DASHBOARD'

const LOADING_STEPS = [
  "Analyzing data patterns...",
  "Structuring key findings from the data...",
  "Identifying trends...",
  "Summarizing insights...",
  "Compiling recommendation..."
]

export const maxDuration = 60

export default function DataAnalyserPage() {
  const [step, setStep] = useState<AppStep>('UPLOAD')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<DashboardTheme>(DASHBOARD_THEMES[0])
  
  const [rawPipelineResult, setRawPipelineResult] = useState<PipelineResult | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  
  const [dashboardData, setDashboardData] = useState<AggregatedDashboardData | null>(null)
  const [aiData, setAiData] = useState<{ headline: string, subheadline: string, chartInsights: Record<string, string> } | null>(null)
  
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingForPDF, setIsExportingForPDF] = useState(false)
  
  const { selectedYears, selectedMonths, clearFilters } = useDashboardStore()

  useEffect(() => {
    if (rawPipelineResult && (step === 'THEMES' || step === 'DASHBOARD')) {
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
      
      const imgData = await toPng(dashboardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: selectedTheme.bgDashboard.includes('950') || selectedTheme.bgDashboard.includes('900') ? '#0f172a' : '#fcfcfc' })
      
      dashboardRef.current.style.width = originalWidth
      dashboardRef.current.style.maxWidth = originalMaxWidth

      const link = document.createElement('a')
      link.href = imgData
      link.download = `sovira-${selectedTheme.id}-${new Date().toISOString().split('T')[0]}.png`
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
      
      await new Promise(r => setTimeout(r, 3500))
      
      clearInterval(loadingInterval)
      toast.success('Data automatically cleaned & structured!')
      setIsParsing(false)
      setStep('TABLE')

      fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Data Analyzed',
          details: { file: file.name, rows: parsedData.length }
        })
      }).catch(console.error)

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
      <div className="w-full h-full overflow-auto text-sm custom-scrollbar pr-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`p-2 text-left ${selectedTheme.fontBody} ${selectedTheme.textMuted} border-b border-slate-200/50`}></th>
              {uniqueD2.map((d2: any, i) => (
                <th key={i} className={`p-2 text-center ${selectedTheme.fontBody} ${selectedTheme.textMuted} border-b border-slate-200/50 text-xs`}>{d2}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueD1.map((d1: any, i) => (
              <tr key={i}>
                <td className={`p-2 ${selectedTheme.fontBody} ${selectedTheme.textMain} border-b border-slate-200/50 text-xs`}>{d1}</td>
                {uniqueD2.map((d2: any, j) => {
                  const cellData = chartSpec.data.find(d => d[dim1] === d1 && d[dim2!] === d2);
                  const val = cellData ? cellData[dataKey] : 0;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  
                  const baseColor = selectedTheme.chartColors[0]; 
                  let bg = 'transparent';
                  let color = selectedTheme.id === 'corporate-dark' ? '#94a3b8' : '#475569';
                  
                  if (intensity > 0) {
                     if (selectedTheme.id === 'corporate-dark') {
                        if (intensity > 0.7) { bg = baseColor; color = '#fff'; }
                        else if (intensity > 0.3) { bg = `${baseColor}80`; color = '#fff'; }
                        else { bg = `${baseColor}40`; color = '#cbd5e1'; }
                     } else {
                        if (intensity > 0.8) { bg = baseColor; color = '#fff'; }
                        else if (intensity > 0.5) { bg = `${baseColor}cc`; color = '#fff'; }
                        else if (intensity > 0.2) { bg = `${baseColor}66`; color = '#1e293b'; }
                        else { bg = `${baseColor}22`; color = '#475569'; }
                     }
                  }

                  return (
                    <td key={j} className="p-1 border-b border-slate-200/50">
                      <div style={{ backgroundColor: bg, color }} className="w-full h-full p-2 text-center rounded text-xs transition-colors font-medium">
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
    const isDark = selectedTheme.id === 'corporate-dark';
    const commonTooltipStyle = {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      border: `1px solid ${selectedTheme.chartGridColor}`,
      borderRadius: '6px',
      color: selectedTheme.id === 'corporate-dark' ? '#fff' : '#1e293b',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      fontFamily: selectedTheme.fontBody.replace('font-', '')
    };
    const commonAxisStyle = { stroke: selectedTheme.chartAxisColor, fontSize: 10, tickLine: false, axisLine: false, fontFamily: 'sans-serif' };
    const commonGridStyle = { stroke: selectedTheme.chartGridColor, strokeDasharray: '3 3', vertical: false };
    const colors = selectedTheme.chartColors;

    if (chartSpec.type === 'donut') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartSpec.data}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="75%"
              paddingAngle={2}
              dataKey="total"
              nameKey={chartSpec.categoryKey}
              isAnimationActive={!isExportingForPDF}
            >
              {chartSpec.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip contentStyle={commonTooltipStyle} itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }} />
            <Legend wrapperStyle={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', fontFamily: selectedTheme.fontBody.replace('font-', '') }} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'heatmap') {
      return renderMatrix(chartSpec);
    }

    if (chartSpec.type === 'combo') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartSpec.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
            <YAxis yAxisId="left" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
            {chartSpec.dataKey2 && <YAxis yAxisId="right" orientation="right" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />}
            <Tooltip contentStyle={commonTooltipStyle} itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }} />
            <Legend wrapperStyle={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', fontFamily: selectedTheme.fontBody.replace('font-', ''), marginTop: '4px' }} />
            <Bar isAnimationActive={!isExportingForPDF} yAxisId="left" dataKey={chartSpec.dataKey} fill={colors[0]} barSize={16} radius={[2, 2, 0, 0]} />
            {chartSpec.dataKey2 ? (
              <Line isAnimationActive={!isExportingForPDF} yAxisId="right" type="monotone" dataKey={chartSpec.dataKey2} stroke={colors[1]} strokeWidth={2} dot={{ r: 3, fill: isDark ? '#0f172a' : '#fff', stroke: colors[1], strokeWidth: 2 }} />
            ) : (
               <Line isAnimationActive={!isExportingForPDF} yAxisId="left" type="monotone" dataKey={chartSpec.dataKey} stroke={colors[1]} strokeWidth={2} dot={{ r: 3, fill: isDark ? '#0f172a' : '#fff', stroke: colors[1], strokeWidth: 2 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    if (chartSpec.type === 'bar') {
      const isHorizontal = chartSpec.orientation === 'horizontal';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartSpec.data.slice(0, isHorizontal ? 10 : 15)} 
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 10, left: isHorizontal ? 10 : -20, bottom: 0 }}
          >
            <CartesianGrid {...commonGridStyle} horizontal={!isHorizontal} vertical={isHorizontal} />
            {isHorizontal ? (
              <>
                <XAxis type="number" {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                <YAxis type="category" dataKey={chartSpec.categoryKey} {...commonAxisStyle} width={70} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontFamily: selectedTheme.fontBody.replace('font-', '') }} />
              </>
            ) : (
              <>
                <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
              </>
            )}
            <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} contentStyle={commonTooltipStyle} itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }} />
            <Bar isAnimationActive={!isExportingForPDF} dataKey={chartSpec.dataKey} fill={colors[2] || colors[0]} barSize={12} radius={isHorizontal ? [0, 2, 2, 0] : [2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (chartSpec.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSpec.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...commonGridStyle} />
            <XAxis dataKey={chartSpec.categoryKey} {...commonAxisStyle} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
            <YAxis {...commonAxisStyle} tickFormatter={(val) => val.toLocaleString()} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
            <Tooltip contentStyle={commonTooltipStyle} itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }} />
            <Line isAnimationActive={!isExportingForPDF} type="monotone" dataKey={chartSpec.dataKey} stroke={colors[3] || colors[0]} strokeWidth={2.5} dot={{ r: 2, fill: isDark ? '#0f172a' : '#fff', stroke: colors[3] || colors[0], strokeWidth: 2 }} activeDot={{ r: 4, fill: colors[3] || colors[0], stroke: '#fff' }} />
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

  const renderDashboardContent = (isPreview: boolean = false) => {
    if (!dashboardData) return null;
    
    return (
      <div className={`w-full mx-auto h-auto md:h-full flex flex-col gap-4 ${isPreview ? 'pointer-events-none' : ''}`} ref={!isPreview ? dashboardRef : null}>
         {selectedTheme.headerBlockClass && (
            <div className={selectedTheme.headerBlockClass}>
               <h1 className={`text-2xl font-bold tracking-widest uppercase ${selectedTheme.fontHeader}`}>
                  {aiData?.headline || "Performance Dashboard"}
               </h1>
            </div>
         )}
         
         {/* Top Bar: Header + KPIs */}
         <div className="flex flex-col lg:flex-row gap-4 shrink-0 lg:h-[120px]">
            {/* Header (if no header block is used) */}
            {!selectedTheme.headerBlockClass && (
              <div className="w-full lg:w-1/3 flex flex-col justify-end pb-2 relative">
                <div className={`absolute left-0 top-0 text-[9px] uppercase tracking-[0.2em] ${selectedTheme.textMuted} font-bold mb-2`}>
                   ANNUAL PERFORMANCE REVIEW
                </div>
                {isGenerating || !aiData ? (
                   <div className="animate-pulse flex flex-col gap-2 mt-6">
                      <div className="h-6 bg-slate-200/50 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-100/50 rounded w-1/2"></div>
                   </div>
                ) : (
                   <div className="mt-6">
                      <h1 className={`text-2xl lg:text-3xl ${selectedTheme.fontHeader} ${selectedTheme.textMain} leading-tight tracking-tight line-clamp-2 pr-20`}>
                         {aiData.headline}
                      </h1>
                      <p className={`text-xs ${selectedTheme.textMuted} ${selectedTheme.fontBody} italic line-clamp-2 mt-1`}>
                         {aiData.subheadline}
                      </p>
                   </div>
                )}
              </div>
            )}
            
            {/* KPIs */}
            <div className={`w-full ${selectedTheme.headerBlockClass ? 'lg:w-full' : 'lg:w-2/3'} grid grid-cols-2 lg:grid-cols-4 gap-4`}>
               {dashboardData.kpis.map((kpi, idx) => {
                 const bgStyle = selectedTheme.kpiBackgrounds ? { backgroundColor: selectedTheme.kpiBackgrounds[idx % selectedTheme.kpiBackgrounds.length] } : {};
                 return (
                   <div key={idx} className={selectedTheme.kpiContainerClass} style={bgStyle}>
                     <span className={`${selectedTheme.kpiTitleClass} line-clamp-1`}>
                        {kpi.title}
                     </span>
                     <div className={`${selectedTheme.kpiValueClass} tracking-tight`}>
                        {formatKPIValue(kpi.value, kpi.format)}
                     </div>
                     <span className={`${selectedTheme.kpiSubClass} line-clamp-1`}>
                        {kpi.subtitle}
                     </span>
                   </div>
                 )
               })}
            </div>
         </div>

         {/* Charts Grid */}
         <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 grid-rows-2 gap-4 min-h-0">
            {dashboardData.charts.map((chart, index) => {
               let wrapperClass = `${selectedTheme.chartContainerClass}`;
               if (chart.type === 'combo' || chart.id.includes('combo') || index === dashboardData.charts.length - 1 && dashboardData.charts.length % 2 !== 0) {
                  wrapperClass += " lg:col-span-2 row-span-1"; 
               } else {
                  wrapperClass += " lg:col-span-1 row-span-1";
               }
               const insightText = aiData?.chartInsights?.[chart.id];
               return (
                  <div key={chart.id} className={wrapperClass}>
                     <div className="flex flex-col shrink-0 mb-2">
                        <h3 className={`${selectedTheme.chartTitleClass} line-clamp-1`}>{chart.title}</h3>
                        <p className={`${selectedTheme.chartSubClass} line-clamp-1`}>Breakdown by {chart.categoryKey.replace(/_/g, ' ')}</p>
                     </div>
                     <div className="flex-1 w-full min-h-[250px] md:min-h-0 relative">
                        {renderChart(chart)}
                     </div>
                     {/* Per-Chart AI Insight Block */}
                     <div className={`mt-2 pt-2 border-t ${selectedTheme.id === 'corporate-dark' ? 'border-slate-700' : 'border-slate-50'} shrink-0`}>
                        {isGenerating || !aiData ? (
                           <div className="animate-pulse h-3 bg-slate-200/50 rounded w-full"></div>
                        ) : (
                           <p className={`text-[10px] ${selectedTheme.id === 'corporate-dark' ? 'text-slate-300' : 'text-slate-600'} ${selectedTheme.fontBody} leading-snug line-clamp-2`}>
                              <strong className={`${selectedTheme.textMain}`}>Insight:</strong> {insightText || 'No specific insight available for this metric.'}
                           </p>
                        )}
                     </div>
                  </div>
               )
            })}
         </div>
      </div>
    );
  };

  return (
    <div className={`${selectedTheme.bgGlobal} min-h-screen font-sans flex flex-col md:flex-row h-screen overflow-hidden transition-colors duration-300`}>
      
      {/* Sidebar */}
      <div className={`hidden md:flex w-16 ${selectedTheme.bgSidebar} border-r ${selectedTheme.id === 'corporate-dark' ? 'border-slate-800' : 'border-slate-200'} shrink-0 flex-col items-center py-6 gap-8 z-10 transition-colors duration-300`}>
         <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-orange-500 block"></span>
         </div>
         <nav className="flex flex-col gap-6 w-full items-center mt-4">
            <button onClick={() => setStep('UPLOAD')} className={`p-2 rounded-md transition-colors ${step === 'UPLOAD' ? (selectedTheme.id === 'corporate-dark' ? 'text-white bg-slate-800' : 'text-slate-800 bg-slate-100') : (selectedTheme.id === 'corporate-dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600')}`}>
               <Upload className="w-5 h-5" />
            </button>
            <button onClick={() => rawData.length > 0 && setStep('TABLE')} disabled={rawData.length === 0} className={`p-2 rounded-md transition-colors ${step === 'TABLE' ? (selectedTheme.id === 'corporate-dark' ? 'text-white bg-slate-800' : 'text-slate-800 bg-slate-100') : (selectedTheme.id === 'corporate-dark' ? 'text-slate-500 hover:text-white disabled:opacity-30' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30')}`}>
               <Table className="w-5 h-5" />
            </button>
            <button onClick={() => dashboardData && setStep('THEMES')} disabled={!dashboardData} className={`p-2 rounded-md transition-colors ${step === 'THEMES' ? (selectedTheme.id === 'corporate-dark' ? 'text-white bg-slate-800' : 'text-slate-800 bg-slate-100') : (selectedTheme.id === 'corporate-dark' ? 'text-slate-500 hover:text-white disabled:opacity-30' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30')}`}>
               <Palette className="w-5 h-5" />
            </button>
            <button onClick={() => dashboardData && setStep('DASHBOARD')} disabled={!dashboardData} className={`p-2 rounded-md transition-colors ${step === 'DASHBOARD' ? (selectedTheme.id === 'corporate-dark' ? 'text-white bg-slate-800' : 'text-slate-800 bg-slate-100') : (selectedTheme.id === 'corporate-dark' ? 'text-slate-500 hover:text-white disabled:opacity-30' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30')}`}>
               <LayoutDashboard className="w-5 h-5" />
            </button>
            <button className={`p-2 rounded-md transition-colors mt-auto ${selectedTheme.id === 'corporate-dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
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
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : (selectedTheme.id === 'corporate-dark' ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 hover:border-slate-400 bg-white')
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <LayoutDashboard className={`w-12 h-12 mx-auto mb-6 ${selectedTheme.id === 'corporate-dark' ? 'text-slate-500' : 'text-slate-300'}`} />
              <h3 className={`text-2xl ${selectedTheme.fontHeader} mb-2 ${selectedTheme.textMain}`}>Upload your dataset</h3>
              <p className={`text-sm mb-2 ${selectedTheme.fontBody} ${selectedTheme.textMuted}`}>Supports CSV, Excel, TXT up to 10MB</p>
              <p className={`text-xs mb-8 ${selectedTheme.fontBody} ${selectedTheme.textMuted} opacity-75`}>
                Your file is processed securely and never shared. <a href="/privacy" target="_blank" className="underline hover:opacity-100">Privacy Policy</a>
              </p>
              
              <label className={`px-8 py-3 rounded text-sm font-semibold tracking-wide cursor-pointer transition-all inline-flex items-center gap-2 shadow-sm ${selectedTheme.id === 'corporate-dark' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
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
              <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 transition-all duration-500 ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'}`}>
                 <Loader2 className={`w-12 h-12 animate-spin mb-6 ${selectedTheme.id === 'corporate-dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                 <h2 className={`text-2xl font-medium mb-2 ${selectedTheme.fontHeader} ${selectedTheme.textMain}`}>Processing Data</h2>
                 <p className={`italic text-lg animate-pulse ${selectedTheme.fontBody} ${selectedTheme.textMuted}`}>{loadingText}</p>
              </div>
            )}
          </div>
        )}

        {step === 'TABLE' && rawData.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`p-4 md:p-6 border-b flex flex-col md:flex-row gap-4 justify-between md:items-center shadow-sm z-10 ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
               <div>
                 <h2 className={`text-xl md:text-2xl ${selectedTheme.fontHeader} ${selectedTheme.textMain} tracking-tight`}>Data Cleansed & Structured</h2>
                 <p className={`text-xs md:text-sm ${selectedTheme.textMuted} ${selectedTheme.fontBody} italic mt-1`}>Our AI has automatically formatted and mapped your raw data.</p>
               </div>
               <button 
                  onClick={() => setStep('THEMES')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
               >
                  Next: Choose Dashboard Style
               </button>
            </div>
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
               <div className={`border rounded-lg shadow-sm overflow-hidden ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="overflow-x-auto">
                     <table className={`w-full text-sm text-left ${selectedTheme.textMuted}`}>
                        <thead className={`text-xs uppercase border-b ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
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
                              <tr key={idx} className={`border-b transition-colors ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                 {Object.values(row).map((val: any, jdx) => (
                                    <td key={jdx} className={`px-6 py-4 whitespace-nowrap ${selectedTheme.textMain}`}>
                                       {val !== null && val !== undefined ? String(val) : <span className="opacity-40 italic">null</span>}
                                    </td>
                                 ))}
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  {rawData.length > 50 && (
                     <div className={`p-4 text-center text-xs font-serif italic border-t ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        Showing first 50 rows of {rawData.length} total rows.
                     </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {step === 'THEMES' && dashboardData && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
             {/* Left Preview Pane */}
             <div className={`flex-1 min-h-[40vh] md:min-h-0 ${selectedTheme.bgGlobal} p-4 flex flex-col relative transition-colors duration-300`}>
                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${selectedTheme.textMain}`}>Style Preview</h2>
                  <p className={`text-sm ${selectedTheme.textMuted}`}>Select a theme from the list to instantly apply it.</p>
                </div>
                <div className="flex-1 border-2 border-dashed border-slate-300/50 rounded-xl p-4 overflow-hidden shadow-inner relative">
                   <div className="absolute inset-0 scale-[0.8] md:scale-[0.95] origin-top opacity-90 transition-all duration-300 overflow-y-auto overflow-x-hidden md:overflow-hidden">
                     {renderDashboardContent(true)}
                   </div>
                   <div className="absolute inset-0 bg-transparent cursor-pointer z-10" onClick={() => setStep('DASHBOARD')} title="Click to view full screen"></div>
                </div>
             </div>
             
             {/* Right Theme Selector */}
             <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col shadow-lg z-20 shrink-0 ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-4 md:p-6 border-b ${selectedTheme.id === 'corporate-dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                   <h3 className={`font-bold text-lg ${selectedTheme.textMain}`}>Dashboard Themes</h3>
                   <p className={`text-sm ${selectedTheme.textMuted} mt-1`}>AI Suggestions</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                   {DASHBOARD_THEMES.map(theme => (
                      <button 
                         key={theme.id}
                         onClick={() => setSelectedTheme(theme)}
                         className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${
                            selectedTheme.id === theme.id 
                            ? 'border-indigo-500 bg-indigo-50/10' 
                            : (selectedTheme.id === 'corporate-dark' ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300')
                         }`}
                      >
                         {selectedTheme.id === theme.id && (
                            <div className="absolute top-3 right-3 text-indigo-500">
                               <CheckCircle2 className="w-5 h-5" />
                            </div>
                         )}
                         <div className="flex gap-2 mb-3">
                            {theme.chartColors.slice(0, 4).map((c, i) => (
                               <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }}></div>
                            ))}
                         </div>
                         <h4 className={`font-bold text-sm mb-1 ${selectedTheme.id === 'corporate-dark' ? 'text-white' : 'text-slate-800'}`}>{theme.name}</h4>
                         <p className={`text-xs ${selectedTheme.id === 'corporate-dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>{theme.description}</p>
                      </button>
                   ))}
                </div>
                <div className={`p-4 border-t ${selectedTheme.id === 'corporate-dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                   <button 
                      onClick={() => setStep('DASHBOARD')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold shadow-md transition-colors flex items-center justify-center gap-2"
                   >
                      Generate Dashboard
                   </button>
                </div>
             </div>
          </div>
        )}

        {step === 'DASHBOARD' && dashboardData && (
          <div className={`flex-1 p-4 lg:p-6 ${selectedTheme.bgDashboard} overflow-y-auto overflow-x-hidden md:overflow-hidden flex flex-col relative transition-colors duration-300`}>
             <div className="relative md:absolute md:right-4 md:top-4 flex justify-end gap-3 z-50 mb-4 md:mb-0">
               <button
                  onClick={() => setStep('THEMES')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 border text-xs font-semibold rounded transition-all shadow-sm ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
               >
                  <Palette className="w-3 h-3" /> Change Theme
               </button>
               <button
                  onClick={handleExportPNG}
                  disabled={isExporting}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 border text-xs font-semibold rounded transition-all shadow-sm ${selectedTheme.id === 'corporate-dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
               >
                  {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  Export PNG
               </button>
            </div>
            {renderDashboardContent(false)}
          </div>
        )}
      </div>
    </div>
  )
}
