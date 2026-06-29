'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, ExternalLink, Activity, Target, Shield, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeCompetitorAction, getCompetitorsAction, removeCompetitorAction } from './actions'

const sharedKeywords = [
  'seo tools', 'keyword research', 'rank tracker', 'seo audit', 'backlink checker',
  'competitor analysis', 'seo software', 'local seo', 'serp tracker', 'website auditor'
]

export default function CompetitorsPage() {
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [competitors, setCompetitors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCompetitors()
  }, [])

  const loadCompetitors = async () => {
    setIsLoading(true)
    const { data } = await getCompetitorsAction()
    if (data) setCompetitors(data)
    setIsLoading(false)
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    setIsAnalyzing(true)
    const { error, success, message } = await analyzeCompetitorAction(url)
    
    if (error) {
      if (error === 'LIMIT_REACHED') {
        window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message } }))
      } else {
        toast.error(error)
      }
    } else if (success) {
      toast.success('Competitor analyzed successfully!')
      setUrl('')
      await loadCompetitors()
    }
    setIsAnalyzing(false)
  }

  const handleRemove = async (id: string) => {
    const { error } = await removeCompetitorAction(id)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Competitor removed')
      setCompetitors(competitors.filter(c => c.id !== id))
    }
  }

  // Base metrics layout
  const baseMetrics = [
    { key: 'domainAuthority', label: 'Domain Authority', icon: Shield },
    { key: 'organicKeywords', label: 'Organic Keywords', icon: Target },
    { key: 'monthlyTraffic', label: 'Monthly Traffic', icon: Activity },
    { key: 'backlinks', label: 'Backlinks', icon: ExternalLink },
  ]

  // Mock baseline for "Your Site"
  const yourSiteMetrics: any = {
    domainAuthority: 42,
    organicKeywords: 1240,
    monthlyTraffic: 12400,
    backlinks: 1847
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Competitor Analysis</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Benchmark your site against top competitors in your niche.</p>
      </div>

      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter competitor URL (e.g. https://competitor.com)"
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[150px]"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]">
          <h3 className="font-semibold text-slate-900 dark:text-white">Domain Comparison</h3>
        </div>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <table className="min-w-[800px] w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-white dark:bg-[#1E293B]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-white dark:bg-[#1E293B] z-10 w-48">Metric</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50/50 dark:bg-blue-900/10">Your Site</th>
                  {competitors.map((comp) => {
                    let domain = ''
                    try { domain = new URL(comp.url).hostname } catch(e) { domain = comp.url }
                    return (
                      <th key={comp.id} scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider max-w-[150px] truncate">
                        {domain}
                      </th>
                    )
                  })}
                  {competitors.length === 0 && (
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">No Competitors Added</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
                {baseMetrics.map((metric, idx) => (
                  <tr key={metric.key} className={idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-[#0F172A]/50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 sticky left-0 z-10 bg-inherit w-48">
                      <metric.icon className="w-4 h-4 text-slate-400" />
                      {metric.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-slate-900 dark:text-white bg-blue-50/30 dark:bg-blue-900/5">
                      {yourSiteMetrics[metric.key].toLocaleString()}
                    </td>
                    {competitors.map((comp) => (
                      <td key={`${comp.id}-${metric.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-600 dark:text-slate-300">
                        {comp.metrics[metric.key]?.toLocaleString() || '-'}
                      </td>
                    ))}
                    {competitors.length === 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-400">-</td>
                    )}
                  </tr>
                ))}
                
                {/* Actions Row */}
                {competitors.length > 0 && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-[#1E293B]"></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-blue-50/30 dark:bg-blue-900/5"></td>
                    {competitors.map((comp) => (
                      <td key={comp.id} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button 
                          onClick={() => handleRemove(comp.id)}
                          className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 mx-auto text-xs font-medium"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Keyword Overlap */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Keyword Overlap (Shared Keywords)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">These are the top keywords that both you and your competitors rank for in the top 100 search results.</p>
        
        <div className="flex flex-wrap gap-2">
          {sharedKeywords.map((kw, i) => (
            <span 
              key={kw} 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                i % 3 === 0 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' : 
                i % 3 === 1 ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' :
                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
              }`}
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

