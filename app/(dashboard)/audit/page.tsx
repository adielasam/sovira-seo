'use client'

import { useState } from 'react'
import { Globe, Search, FileDown, CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import toast from 'react-hot-toast'

interface AuditResult {
  overallScore: number;
  seoScore: number;
  performanceScore: number;
  speed: string;
  issues: {
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
  }[]
}

export default function AuditPage() {
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) {
      toast.error('Please enter a URL to audit')
      return
    }
    
    setIsAuditing(true)
    setResult(null)

    try {
      // Bypassing any proxy by hitting the route handler, which natively uses fetch to Google APIs
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await res.json()
      
      if (!res.ok) {
        if (data.error === 'LIMIT_REACHED') {
          window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: data.message } }))
          return
        }
        throw new Error(data.error || 'Audit failed')
      }
      
      setResult(data)
      toast.success('Audit completed successfully!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsAuditing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#16A34A' // green-600
    if (score >= 50) return '#EA580C' // orange-600
    return '#DC2626' // red-600
  }

  const getScoreText = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600 dark:text-green-400' }
    if (score >= 50) return { text: 'Needs Improvement', color: 'text-orange-600 dark:text-orange-400' }
    return { text: 'Poor', color: 'text-red-600 dark:text-red-400' }
  }

  const scoreData = result ? [{ name: 'Score', value: result.overallScore, fill: getScoreColor(result.overallScore) }] : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Technical SEO Audit</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Run a comprehensive on-page SEO & performance analysis of your website.</p>
      </div>

      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={handleRunAudit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px]"
          >
            {isAuditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {isAuditing ? 'Analyzing...' : 'Run Audit'}
          </button>
        </form>
      </div>

      {isAuditing && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center min-h-[400px] overflow-hidden">
          <div className="relative flex items-center justify-center w-32 h-32 mb-10">
            {/* Ambient glows */}
            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute inset-4 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '500ms' }}></div>
            
            {/* Rotating geometric shapes */}
            <div className="absolute inset-0 rounded-2xl border-4 border-slate-100 dark:border-slate-800 rotate-45"></div>
            <div className="absolute inset-0 rounded-2xl border-4 border-blue-500 border-r-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
            
            <Globe className="w-10 h-10 text-blue-600 dark:text-blue-400 relative z-10 animate-pulse" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Running deep site analysis...</h2>
          
          <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full ring-1 ring-slate-200 dark:ring-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="animate-pulse">Scanning DOM elements & meta tags...</span>
            </div>
            <p className="text-xs text-slate-400">This live audit typically takes 10-20 seconds.</p>
          </div>
        </div>
      )}

      {result && !isAuditing && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit Results for <span className="text-blue-600">{url}</span></h2>
            <button className="flex items-center justify-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              <FileDown className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Gauge */}
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Overall Health Score</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={scoreData} startAngle={180} endAngle={0}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-slate-900 dark:fill-white">
                      {result.overallScore}
                    </text>
                    <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-medium fill-slate-500 dark:fill-slate-400">
                      /100
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className={`${getScoreText(result.overallScore).color} font-medium mt-2`}>
                {getScoreText(result.overallScore).text}
              </p>
            </div>

            {/* Check Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-blue-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">SEO Score</p>
                <p className={`text-2xl font-bold ${getScoreText(result.seoScore).color}`}>{result.seoScore}/100</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-purple-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Performance</p>
                <p className={`text-2xl font-bold ${getScoreText(result.performanceScore).color}`}>{result.performanceScore}/100</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-cyan-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Speed Index</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.speed}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-orange-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Issues</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.issues.length}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-red-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{result.issues.filter(i => i.type === 'critical').length}</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-5 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-green-500">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Connection</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">Secure</p>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-white">Identified Issues (Top {result.issues.length})</h3>
            </div>
            {result.issues.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p>Great job! No major issues were detected by Lighthouse.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.issues.map((issue, idx) => (
                  <li key={idx} className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {issue.type === 'critical' ? (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {issue.type === 'critical' ? (
                          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Critical</span>
                        ) : (
                          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Warning</span>
                        )}
                        <h4 className="font-medium text-slate-900 dark:text-white">{issue.title}</h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{issue.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
