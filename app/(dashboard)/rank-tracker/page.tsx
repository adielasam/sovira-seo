'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Minus, Filter, Download, Loader2, RefreshCw, Trash2, Edit2, ChevronDown, ChevronUp, Bot, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { AddKeywordModal } from '@/components/rank-tracker/add-keyword-modal'

export default function RankTrackerPage() {
  const [trackedData, setTrackedData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false)

  const loadKeywords = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/rank-tracker/keywords')
      const json = await res.json()
      if (res.ok) {
        setTrackedData(json.data || [])
      } else {
        toast.error(json.error || 'Failed to load keywords')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKeywords()
  }, [])

  const handleRefreshRank = async (keywordId: number) => {
    setRefreshingId(keywordId)
    try {
      const res = await fetch('/api/rank-tracker/check-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to check')
      
      toast.success(`Rank updated: ${data.newRank ?? 'Not in top 100'}`)
      
      // Update locally
      setTrackedData(prev => prev.map(k => {
        if (k.id === keywordId) {
          const newHistory = [{ date: new Date().toISOString(), rank: data.newRank }, ...(k.history || [])]
          return { ...k, currentRank: data.newRank, change: data.delta, history: newHistory }
        }
        return k
      }))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (keywordId: number) => {
    if (!confirm('Are you sure you want to stop tracking this keyword? This will delete all its rank history.')) return
    
    setDeletingId(keywordId)
    try {
      const res = await fetch(`/api/rank-tracker/keywords/${keywordId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      toast.success('Keyword removed')
      setTrackedData(prev => prev.filter(k => k.id !== keywordId))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const generateInsight = async () => {
    if (trackedData.length === 0) return toast.error('No keywords to analyze')
    setIsGeneratingInsight(true)
    try {
      const res = await fetch('/api/rank-tracker/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: trackedData })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAiInsight(json.insight)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate AI insight')
    } finally {
      setIsGeneratingInsight(false)
    }
  }

  const getDynamicChartData = () => {
    const dateMap: Record<string, { totalRank: number, count: number }> = {}
    
    trackedData.forEach(kw => {
      if (kw.history && kw.history.length > 0) {
        kw.history.forEach((entry: any) => {
           if (entry.rank === null) return // Skip null ranks for averages
           const d = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
           if (!dateMap[d]) dateMap[d] = { totalRank: 0, count: 0 }
           dateMap[d].totalRank += entry.rank
           dateMap[d].count += 1
        })
      }
    })
    
    const aggregated = Object.keys(dateMap).map(date => ({
      date,
      rank: Math.round(dateMap[date].totalRank / dateMap[date].count)
    }))
    
    // Sort chronologically (assuming the strings sort okay for the last 30 days, 
    // real app would use proper date sorting)
    aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return aggregated
  }

  const chartData = getDynamicChartData()

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rank Tracker</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Monitor your search engine rankings over time.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Keyword
          </button>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-indigo-500/20 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Rank Analysis
          </h3>
          {aiInsight ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsight}</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Generate a plain-English summary of your ranking trends over the last 30 days.</p>
          )}
        </div>
        <button 
          onClick={generateInsight}
          disabled={isGeneratingInsight || trackedData.length === 0}
          className="shrink-0 flex items-center gap-2 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
        >
          {isGeneratingInsight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {aiInsight ? 'Regenerate Insight' : 'Analyze Trends'}
        </button>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Average Rank (30 Days)</h3>
        </div>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  reversed 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[1, 100]} 
                  ticks={[1, 25, 50, 75, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#60A5FA' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value) => [`Rank ${value}`, 'Average']}
                />
                <Line type="monotone" dataKey="rank" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <TrendingUp className="w-8 h-8 text-slate-300" />
              <p>Add your first keyword to see average rank trends over time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A]">
          <h3 className="font-semibold text-slate-900 dark:text-white">Tracked Keywords</h3>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[800px] w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-white dark:bg-[#1E293B]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keyword</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Domain</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Change</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trend (7d)</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading your tracked keywords...
                  </td>
                </tr>
              ) : trackedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    You aren't tracking any keywords yet. Click "Add Keyword" to start monitoring!
                  </td>
                </tr>
              ) : (
                trackedData.map((kw, i) => (
                  <tr key={kw.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {kw.keyword}
                      <div className="text-xs text-slate-500 font-normal mt-0.5">Vol: {kw.search_volume || 'N/A'} • {kw.country_code?.toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                      {kw.project_domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {kw.currentRank === null ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                           Not in top 100
                         </span>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{kw.currentRank}</span>
                          {kw.currentRank <= 3 && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">TOP 3</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium">
                        {kw.change > 0 ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> +{kw.change}</span>
                        ) : kw.change < 0 ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><TrendingDown className="w-4 h-4" /> {kw.change}</span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1"><Minus className="w-4 h-4" /> 0</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-[150px]">
                      {/* Mini inline sparkline for last 7 checks */}
                      {kw.history && kw.history.length > 0 && (
                        <div className="h-8 w-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...kw.history].reverse().slice(-7)}>
                              <YAxis reversed hide domain={['dataMin - 5', 'dataMax + 5']} />
                              <Line 
                                type="monotone" 
                                dataKey="rank" 
                                stroke={kw.change >= 0 ? '#10b981' : '#ef4444'} 
                                strokeWidth={2} 
                                dot={false} 
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-1">
                      <button
                        onClick={() => handleRefreshRank(kw.id)}
                        disabled={refreshingId === kw.id}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Check Now"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingId === kw.id ? 'animate-spin text-blue-600' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(kw.id)}
                        disabled={deletingId === kw.id}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === kw.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddKeywordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(newKw) => setTrackedData([newKw, ...trackedData])} 
      />
    </div>
  )
}
