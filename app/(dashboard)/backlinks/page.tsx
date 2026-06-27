'use client'

import { useState } from 'react'
import { Link2, ShieldAlert, TrendingDown, ArrowUpRight, Search, Filter, ExternalLink, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { date: 'Jun 1', links: 1240 },
  { date: 'Jun 5', links: 1305 },
  { date: 'Jun 10', links: 1420 },
  { date: 'Jun 15', links: 1480 },
  { date: 'Jun 20', links: 1560 },
  { date: 'Jun 25', links: 1720 },
  { date: 'Jun 30', links: 1847 },
]

const backlinks = [
  { id: 1, source: 'https://searchengineland.com/seo-tools', target: '/', anchor: 'SEO tools', da: 91, spam: 1, status: 'active' },
  { id: 2, keyword: 'https://moz.com/blog/best-trackers', target: '/rank-tracker', anchor: 'Sovira SEO v2', da: 89, spam: 2, status: 'active' },
  { id: 3, source: 'https://marketingprofs.com/article/1', target: '/features', anchor: 'keyword research', da: 76, spam: 4, status: 'lost' },
  { id: 4, source: 'https://medium.com/@seoguru/audit', target: '/audit', anchor: 'free site audit', da: 95, spam: 5, status: 'active' },
  { id: 5, source: 'http://spammy-directory-xyz.com/link', target: '/', anchor: 'click here', da: 12, spam: 85, status: 'active' },
  { id: 6, source: 'https://techcrunch.com/startups/seo', target: '/', anchor: 'Sovira', da: 93, spam: 1, status: 'active' },
  { id: 7, source: 'https://smallbiztrends.com/seo', target: '/pricing', anchor: 'affordable seo', da: 71, spam: 3, status: 'lost' },
]

export default function BacklinkMonitorPage() {
  const [project, setProject] = useState('sovira.com')

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Backlink Monitor</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Track your inbound links, referring domains, and identify toxic links.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="sovira.com">sovira.com</option>
            <option value="client-site.com">client-site.com</option>
          </select>
          <button
            className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Backlinks</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">1,847</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Link2 className="w-3 h-3" />
            </div>
            +23 new this week
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Referring Domains</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">342</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
            <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
              <ArrowUpRight className="w-3 h-3" />
            </div>
            +5 new domains
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Toxic Domains</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">12</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400">
            <div className="p-1 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <ShieldAlert className="w-3 h-3" />
            </div>
            2 new toxic links
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Lost Backlinks</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">8</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
            <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="w-3 h-3" />
            </div>
            Last 30 days
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
              {backlinks.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-[250px]">
                    <a href="#" className="hover:underline flex items-center gap-1">
                      {link.source || link.keyword} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {link.target}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                    "{link.anchor}"
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${link.da > 70 ? 'text-green-600 dark:text-green-400' : link.da > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {link.da}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${link.spam > 30 ? 'text-red-600 dark:text-red-400' : link.spam > 10 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {link.spam}%
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

