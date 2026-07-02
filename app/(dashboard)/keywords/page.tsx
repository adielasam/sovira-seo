'use client'

import { useState, useCallback, useEffect, useTransition, Fragment } from 'react'
import { Search, Download, Filter, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, ChevronDown, ChevronUp, Lock, Target, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { trackKeyword, untrackKeyword, getTrackedKeywords, generateKeywordIdeasAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { PaywallBlur } from '@/components/ui/paywall-blur'

interface KeywordResult {
  id?: number
  keyword: string
  volume: string
  difficulty: number
  cpc: string
  trend: 'up' | 'down'
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational'
}

function getDifficultyBadge(score: number) {
  if (score < 40) return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-green-200 dark:border-green-800/50">Easy ({score})</span>
  if (score < 70) return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800/50">Medium ({score})</span>
  return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-200 dark:border-red-800/50">Hard ({score})</span>
}

function getIntentBadge(intent: KeywordResult['intent']) {
  const colors: Record<KeywordResult['intent'], string> = {
    Informational: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Commercial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Transactional: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Navigational: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  }
  return <span className={`${colors[intent]} px-2 py-0.5 rounded-full text-xs font-medium`}>{intent}</span>
}

export default function KeywordsPage() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<KeywordResult[]>([])
  const [lastQuery, setLastQuery] = useState('')
  const [trackedKeywords, setTrackedKeywords] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isPro, setIsPro] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    const checkPlan = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
        const plan = profile?.plan || 'free'
        setIsPro(['starter', 'pro', 'agency'].includes(plan))
      }
    }
    checkPlan()
    const loadTracked = async () => {
      const { data } = await getTrackedKeywords()
      if (data) {
        setTrackedKeywords(new Set(data.map(k => k.keyword)))
      }
    }
    loadTracked()
  }, [])

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      toast.error('Please enter a keyword to research')
      return
    }
    setIsSearching(true)
    const { data, error, message } = await generateKeywordIdeasAction(query.trim())
    if (error) {
      if (error === 'LIMIT_REACHED') {
        window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message } }))
      } else {
        toast.error(error)
      }
      setIsSearching(false)
      return
    }
    
    if (data) {
      setResults(data as any[])
      setLastQuery(query.trim())
      toast.success(`Found ${data.length} keywords for "${query.trim()}"`, { icon: '🔍' })
    }
    setIsSearching(false)
  }, [query])

  const handleTrack = async (item: KeywordResult) => {
    const isTracked = trackedKeywords.has(item.keyword)
    
    // Optimistic update
    setTrackedKeywords(prev => {
      const next = new Set(prev)
      if (isTracked) next.delete(item.keyword)
      else next.add(item.keyword)
      return next
    })

    startTransition(async () => {
      if (isTracked) {
        const { error } = await untrackKeyword(item.keyword)
        if (error) {
          toast.error(error)
          // Revert on error
          setTrackedKeywords(prev => new Set(prev).add(item.keyword))
        } else {
          toast.success(`Removed "${item.keyword}" from tracker`)
        }
      } else {
        const { error } = await trackKeyword({
          keyword: item.keyword,
          volume: item.volume,
          difficulty: item.difficulty,
          cpc: item.cpc,
          trend: item.trend,
          intent: item.intent
        })
        if (error) {
          toast.error(error)
          // Revert on error
          setTrackedKeywords(prev => {
            const next = new Set(prev)
            next.delete(item.keyword)
            return next
          })
        } else {
          toast.success(`Tracking "${item.keyword}"`, { icon: '📌' })
        }
      }
    })
  }

  const handleExport = () => {
    const header = 'Keyword,Volume,Difficulty,CPC,Trend,Intent'
    const rows = results.map(r => `"${r.keyword}",${r.volume},${r.difficulty},${r.cpc},${r.trend},${r.intent}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sovira-keywords-${lastQuery.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keyword Research</h1>
          {lastQuery && (
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Showing results for <span className="font-semibold text-blue-600 dark:text-blue-400">&quot;{lastQuery}&quot;</span>
            </p>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter seed keyword (e.g. 'make money online')"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap min-w-[110px]"
            >
              {isSearching ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Research
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {results.length > 0 ? (
      <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Keywords Found', value: results.length.toString() },
          { label: 'Avg. Difficulty', value: `${Math.round(results.reduce((a, b) => a + b.difficulty, 0) / results.length)}/100` },
          { label: 'Avg. CPC', value: `$${(results.reduce((a, b) => a + parseFloat(b.cpc.replace('$', '')), 0) / results.length).toFixed(2)}` },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-[#1E293B] rounded-xl p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Results Table */}
      <PaywallBlur isPro={isPro}>
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-[600px] w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-[#0F172A]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keyword</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">KD</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Intent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trend</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Track</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
              {results.map((item) => (
                <Fragment key={item.id}>
                <tr 
                  onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id!)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white max-w-xs flex items-center gap-2">
                    {expandedRow === item.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    )}
                    <span className="block truncate">{item.keyword}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200">{item.volume}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{getDifficultyBadge(item.difficulty)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-medium">{item.cpc}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{getIntentBadge(item.intent)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.trend === 'up'
                      ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><TrendingUp className="w-4 h-4" /> Up</span>
                      : <span className="flex items-center gap-1 text-red-500 dark:text-red-400"><TrendingDown className="w-4 h-4" /> Down</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTrack(item); }}
                      className={`flex items-center justify-end gap-1 ml-auto transition-colors font-medium ${
                        trackedKeywords.has(item.keyword)
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                      }`}
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {trackedKeywords.has(item.keyword) ? 'Tracked' : 'Track'}
                    </button>
                  </td>
                </tr>
                {expandedRow === item.id && (
                  <tr>
                    <td colSpan={7} className="p-0 bg-slate-50/50 dark:bg-[#0F172A]/30 border-b border-slate-200 dark:border-slate-800">
                      <div className="p-6 relative overflow-hidden">
                        {!isPro && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-md bg-white/60 dark:bg-slate-900/60">
                            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pro Feature</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Upgrade to view deep insights</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                              <Target className="w-4 h-4 text-blue-500" /> SERP Features
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium rounded border border-slate-200 dark:border-slate-700">Featured Snippet</span>
                              <span className="px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium rounded border border-slate-200 dark:border-slate-700">People Also Ask</span>
                              <span className="px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium rounded border border-slate-200 dark:border-slate-700">Video Carousel</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                              <Globe className="w-4 h-4 text-purple-500" /> Global vs Local
                            </h4>
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                <span>Global Vol:</span>
                                <span className="font-semibold">{parseInt(item.volume.replace('K', '')) * 3}K</span>
                              </div>
                              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                <span>US Vol:</span>
                                <span className="font-semibold">{item.volume}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                              <TrendingUp className="w-4 h-4 text-emerald-500" /> Competition
                            </h4>
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                              <div className="flex justify-between">
                                <span>Top 10 Avg DA:</span>
                                <span className="font-semibold">{(item.difficulty * 0.8).toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Backlinks:</span>
                                <span className="font-semibold">{(item.difficulty * 1.5).toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="bg-white dark:bg-[#1E293B] px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-white">{results.length}</span> results for <span className="font-medium text-blue-600 dark:text-blue-400">&quot;{lastQuery}&quot;</span>
          </p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="px-3 py-1.5 rounded-md border border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-sm font-medium text-blue-600 dark:text-blue-400">1</button>
            <button className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      </PaywallBlur>
      </div>
      ) : (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Keywords Researched Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Enter a seed keyword in the search bar above and click "Research" to generate a list of related keywords, search volumes, and difficulty data.
          </p>
        </div>
      )}
    </div>
  )
}

