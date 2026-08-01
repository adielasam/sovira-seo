'use client'

import { useState, useEffect } from 'react'
import { Link2, ShieldAlert, TrendingDown, ArrowUpRight, Search, Filter, ExternalLink, Download, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { getBacklinksAction, scanBacklinksAction, addBacklinkAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { PaywallBlur } from '@/components/ui/paywall-blur'

export default function BacklinkMonitorPage() {
  const [project, setProject] = useState('sovira.com')
  const [backlinks, setBacklinks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isPro, setIsPro] = useState(false)
  
  const [newLink, setNewLink] = useState({ sourceUrl: '', targetPage: '/', anchorText: '', da: 10, spam: 0 })

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
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    const { data } = await getBacklinksAction(project)
    if (data) {
      setBacklinks(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (project) {
      loadData()
    }
  }, [project])

  const handleScan = async () => {
    setIsScanning(true)
    const res = await scanBacklinksAction(project)
    setIsScanning(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(`Found ${res.count} backlinks!`)
      loadData()
    }
  }

  const handleAddLink = async () => {
    if (!newLink.sourceUrl) {
      toast.error('Source URL is required')
      return
    }
    const res = await addBacklinkAction({ ...newLink, domain: project })
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Backlink added manually')
      setShowAddModal(false)
      loadData()
    }
  }

  // Calculate metrics
  const activeLinks = backlinks.filter(b => b.status === 'active')
  const lostLinks = backlinks.filter(b => b.status === 'lost')
  const totalBacklinks = backlinks.length
  
  // Unique domains
  const uniqueDomains = new Set(backlinks.map(b => {
    try { return new URL(b.source_url).hostname } catch (e) { return b.source_url }
  })).size

  const toxicDomains = backlinks.filter(b => b.spam_score > 30).length
  
  const newThisWeek = backlinks.filter(b => {
    const diffTime = Math.abs(new Date().getTime() - new Date(b.discovered_at).getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7
  }).length

  // Generate dynamic chart data based on discovered_at dates
  const getDynamicChartData = () => {
    if (backlinks.length === 0) return []
    const dateMap: Record<string, number> = {}
    
    // Sort oldest to newest
    const sorted = [...backlinks].sort((a, b) => new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime())
    
    let cumulative = 0
    sorted.forEach(link => {
       const d = new Date(link.discovered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
       cumulative += 1
       dateMap[d] = cumulative
    })
    
    return Object.keys(dateMap).map(date => ({ date, links: dateMap[date] }))
  }

  const chartData = getDynamicChartData()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Backlink Monitor</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Track your inbound links, referring domains, and identify toxic links.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text"
            placeholder="Target Domain (e.g. sovira.com)"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="px-4 py-2 w-[200px] bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Deep Scan
          </button>
        </div>
      </div>

      <PaywallBlur isPro={isPro}>
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Backlinks</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{totalBacklinks}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Link2 className="w-3 h-3" />
            </div>
            +{newThisWeek} new this week
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Referring Domains</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{uniqueDomains}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
            <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <ArrowUpRight className="w-3 h-3" />
            </div>
            Active referring domains
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Toxic Domains</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{toxicDomains}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400">
            <div className="p-1 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <ShieldAlert className="w-3 h-3" />
            </div>
            Spam score {'>'} 30%
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Lost Backlinks</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{lostLinks.length}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
            <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="w-3 h-3" />
            </div>
            Total lost
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Link Profile Growth</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorLinks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#60A5FA' }}
              />
              <Area type="monotone" dataKey="links" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorLinks)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-[#0F172A]">
          <h3 className="font-semibold text-slate-900 dark:text-white px-2">Recent Backlinks</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search backlinks..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 text-slate-500 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[600px] w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-white dark:bg-[#1E293B]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source URL</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Page</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Anchor Text</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DA</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Spam Score</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading your backlinks...
                  </td>
                </tr>
              ) : backlinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No backlinks found. Click "Deep Scan" to start!
                  </td>
                </tr>
              ) : (
                backlinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-[250px]">
                      <a href={link.source_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                        {link.source_url.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {link.target_page}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      "{link.anchor_text}"
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${link.domain_authority > 70 ? 'text-green-600 dark:text-green-400' : link.domain_authority > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {link.domain_authority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${link.spam_score > 30 ? 'text-red-600 dark:text-red-400' : link.spam_score > 10 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                        {link.spam_score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {link.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Lost
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </PaywallBlur>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Backlink</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source URL</label>
                <input 
                  type="url" 
                  value={newLink.sourceUrl}
                  onChange={e => setNewLink({...newLink, sourceUrl: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                  placeholder="https://example.com/blog-post" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anchor Text</label>
                <input 
                  type="text" 
                  value={newLink.anchorText}
                  onChange={e => setNewLink({...newLink, anchorText: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                  placeholder="Click here" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Domain Auth</label>
                  <input 
                    type="number" 
                    value={newLink.da}
                    onChange={e => setNewLink({...newLink, da: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Spam Score %</label>
                  <input 
                    type="number" 
                    value={newLink.spam}
                    onChange={e => setNewLink({...newLink, spam: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddLink}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500"
              >
                Save Backlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

