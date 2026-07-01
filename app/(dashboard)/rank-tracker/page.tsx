'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, Minus, Filter, Download, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { getTrackedKeywords, refreshKeywordRankAction } from '../keywords/actions'

const chartData = [
  { date: 'Jun 1', rank: 45 },
  { date: 'Jun 5', rank: 42 },
  { date: 'Jun 10', rank: 38 },
  { date: 'Jun 15', rank: 35 },
  { date: 'Jun 20', rank: 28 },
  { date: 'Jun 25', rank: 24 },
  { date: 'Jun 30', rank: 22 },
]

const keywords = [
  { id: 1, keyword: 'seo software', rank: 4, change: 2, volume: '45,000', url: '/seo-software' },
  { id: 2, keyword: 'rank tracker', rank: 12, change: -3, volume: '22,400', url: '/rank-tracker' },
  { id: 3, keyword: 'best seo tools', rank: 8, change: 5, volume: '18,500', url: '/best-tools' },
  { id: 4, keyword: 'local seo', rank: 22, change: 0, volume: '33,100', url: '/local-seo' },
  { id: 5, keyword: 'backlink checker', rank: 15, change: 8, volume: '110,000', url: '/backlinks' },
  { id: 6, keyword: 'seo audit free', rank: 3, change: 1, volume: '74,000', url: '/free-audit' },
]

export default function RankTrackerPage() {
  const router = useRouter()
  const [targetDomain, setTargetDomain] = useState('sovira.com')
  const [trackedData, setTrackedData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)

  const loadKeywords = async () => {
    setIsLoading(true)
    const { data } = await getTrackedKeywords()
    if (data) {
      setTrackedData(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadKeywords()
  }, [])

  const handleAddKeyword = () => {
    router.push('/keywords')
    toast.success('Search for a keyword and click Track to add it here!', { icon: '💡' })
  }

  const handleRefreshRank = async (keywordId: number, keyword: string) => {
    if (!targetDomain) {
      toast.error('Please enter a target domain first')
      return
    }
    setRefreshingId(keywordId)
    const res = await refreshKeywordRankAction(keywordId, keyword, targetDomain)
    setRefreshingId(null)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Rank updated: ${res.newRank}`)
      loadKeywords()
    }
  }

  const getDynamicChartData = () => {
    const dateMap: Record<string, { totalRank: number, count: number }> = {}
    
    trackedData.forEach(kw => {
      if (kw.rank_history && kw.rank_history.length > 0) {
        kw.rank_history.forEach((entry: any) => {
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
    
    return aggregated.length > 0 ? aggregated : chartData
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rank Tracker</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Monitor your search engine rankings over time.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text"
            placeholder="Target Domain (e.g. sovira.com)"
            value={targetDomain}
            onChange={(e) => setTargetDomain(e.target.value)}
            className="px-4 py-2 w-[200px] bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            onClick={handleAddKeyword}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Keyword
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Average Rank (30 Days)</h3>
          <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +23 positions
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getDynamicChartData()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis reversed stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[1, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#60A5FA' }}
              />
              <Line type="monotone" dataKey="rank" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A]">
          <h3 className="font-semibold text-slate-900 dark:text-white">Tracked Keywords</h3>
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[600px] w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-white dark:bg-[#1E293B]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keyword</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Rank</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Change</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Search Volume</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target URL</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading your tracked keywords...
                  </td>
                </tr>
              ) : trackedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    You aren't tracking any keywords yet. Go to Keyword Research to add some!
                  </td>
                </tr>
              ) : (
                trackedData.map((kw, i) => (
                  <tr key={kw.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {kw.keyword}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-white w-8">{kw.rank || '-'}</span>
                        {kw.rank > 0 && kw.rank <= 3 && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-800">TOP 3</span>}
                        {kw.rank === 100 && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">100+</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium">
                        {kw.change > 0 ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> +{kw.change}</span>
                        ) : kw.change < 0 ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><TrendingDown className="w-4 h-4" /> {kw.change}</span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1"><Minus className="w-4 h-4" /> {kw.change}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {kw.volume}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      /{kw.keyword.replace(/\s+/g, '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRefreshRank(kw.id, kw.keyword)}
                        disabled={refreshingId === kw.id}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh Rank"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingId === kw.id ? 'animate-spin text-blue-600' : ''}`} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

