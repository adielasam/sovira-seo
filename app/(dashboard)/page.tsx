import Link from 'next/link'
import { Activity, Search, Tag, Sparkles, FileText, ArrowUpRight, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const stats = [
  { name: 'SEO Score', value: '78', unit: '/100', change: '+5 from last week', trend: 'up', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  { name: 'Keywords Tracked', value: '142', unit: '', change: '12 new this week', trend: 'up', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Backlinks', value: '1,847', unit: '', change: '23 new this week', trend: 'up', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Est. Monthly Traffic', value: '12,400', unit: '', change: '+8% from last month', trend: 'up', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
]

const recentActivity = [
  { id: 1, title: 'SEO Audit completed for', target: 'example.com', time: '2 hours ago', icon: Search, type: 'success' },
  { id: 2, title: 'Generated 5 new blog titles for', target: '"SEO Tools"', time: '4 hours ago', icon: Sparkles, type: 'info' },
  { id: 3, title: 'Rank dropped for keyword', target: '"Best rank tracker"', time: 'Yesterday', icon: TrendingUp, type: 'warning' },
  { id: 4, title: 'Found 12 new backlinks from', target: 'high DA domains', time: '2 days ago', icon: LinkIcon, type: 'success' },
  { id: 5, title: 'Exported monthly report to', target: 'PDF', time: '3 days ago', icon: FileText, type: 'info' },
]

// Mocking LinkIcon here because it clashes with Next Link if not renamed
function LinkIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
}

const quickActions = [
  { name: 'Run Audit', href: '/audit', icon: Search, color: 'bg-blue-600' },
  { name: 'Add Keywords', href: '/keywords', icon: Tag, color: 'bg-indigo-600' },
  { name: 'Generate Content', href: '/content', icon: Sparkles, color: 'bg-purple-600' },
  { name: 'View Reports', href: '/reports', icon: FileText, color: 'bg-teal-600' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch real tracked keywords count
  let trackedCount = 0
  if (user) {
    const { count } = await supabase
      .from('tracked_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    trackedCount = count || 0
  }

  // Inject real data into stats
  const dynamicStats = [
    { name: 'SEO Score', value: '78', unit: '/100', change: '+5 from last week', trend: 'up', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    { name: 'Keywords Tracked', value: trackedCount.toString(), unit: '', change: 'Real-time data', trend: 'up', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { name: 'Backlinks', value: '1,847', unit: '', change: '23 new this week', trend: 'up', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { name: 'Est. Monthly Traffic', value: '12,400', unit: '', change: '+8% from last month', trend: 'up', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 w-full">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 w-full">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">View all</Link>
          </div>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-2 overflow-hidden">
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
                    <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                      {activity.title} <span className="text-slate-500 dark:text-slate-400">{activity.target}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
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
                <div>
                  <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.name}</h3>
                </div>
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
