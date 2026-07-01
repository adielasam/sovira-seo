import Link from 'next/link'
import { Search, Tag, Sparkles, FileText, ArrowUpRight, TrendingUp } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const quickActions = [
  { name: 'Run Audit', href: '/audit', icon: Search, color: 'bg-blue-600' },
  { name: 'Add Keywords', href: '/keywords', icon: Tag, color: 'bg-indigo-600' },
  { name: 'Generate Content', href: '/content', icon: Sparkles, color: 'bg-purple-600' },
  { name: 'View Reports', href: '/reports', icon: FileText, color: 'bg-teal-600' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch real metrics
  let keywordsCount = 0
  let backlinksCount = 0
  let seoScore = 0 // Placeholder until we have a real aggregate score logic
  let estTraffic = 0 // Placeholder

  let recentActivity: any[] = []

  if (user) {
    // Get Keywords Count
    const { count: kwCount } = await supabase
      .from('tracked_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    keywordsCount = kwCount || 0

    // Get Backlinks Count
    const { count: blCount } = await supabase
      .from('backlinks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    backlinksCount = blCount || 0

    // Fetch real recent activity
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (activities && activities.length > 0) {
      recentActivity = activities.map((act: any) => ({
        id: act.id,
        title: act.action.replace('_', ' '),
        target: '',
        time: new Date(act.created_at).toLocaleDateString(),
        icon: FileText,
        type: 'info'
      }))
    }
  }

  const dynamicStats = [
    { name: 'SEO Score', value: seoScore > 0 ? seoScore.toString() : '-', unit: '/100', change: seoScore > 0 ? '+0 from last week' : 'No data yet', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    { name: 'Keywords Tracked', value: keywordsCount.toString(), unit: '', change: 'Real-time count', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { name: 'Backlinks', value: backlinksCount.toString(), unit: '', change: 'Real-time count', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { name: 'Est. Monthly Traffic', value: '-', unit: '', change: 'Connect Analytics', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-md transition-all duration-200">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</span>
              {stat.unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.unit}</span>}
            </div>
            <div className={`mt-4 flex items-center gap-2 text-xs font-medium ${stat.color}`}>
              <div className={`p-1 rounded-full ${stat.bg}`}>
                <ArrowUpRight className="w-3 h-3" />
              </div>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">View all</Link>
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-2 overflow-hidden">
            {recentActivity.length > 0 ? (
              <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-4 rounded-lg">
                    <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${
                      activity.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      activity.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white font-medium capitalize">
                        {activity.title} <span className="text-slate-500 dark:text-slate-400">{activity.target}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No recent activity found. Start tracking keywords or run an audit to see updates here.</p>
                <Link href="/keywords" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors">Add Keywords</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="flex items-center gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-md hover:ring-blue-500/50 group transition-all duration-200"
              >
                <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.name}</h3>
              </Link>
            ))}
          </div>

          {/* Pro Banner */}
          <div className="mt-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-blue-100 text-sm mb-4">Get unlimited keywords, full API access, and priority support.</p>
            <Link href="/settings" className="inline-block px-4 py-2 bg-white text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors">
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
