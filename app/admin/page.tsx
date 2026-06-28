import { createClient } from '@/lib/supabase/server'
import { Users, FileText, Tag, Activity, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Fetch counts
  const [{ count: userCount }, { count: contentCount }, { count: keywordCount }] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('content_generations').select('*', { count: 'exact', head: true }),
    supabase.from('tracked_keywords').select('*', { count: 'exact', head: true })
  ])

  // Fetch active today (from activity logs)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Note: we can't easily COUNT DISTINCT in supabase client without RPC, 
  // so we'll fetch today's logs and count unique users manually (fine for MVP)
  const { data: todayLogs } = await supabase
    .from('activity_logs')
    .select('user_id')
    .gte('created_at', today.toISOString())
    
  const activeTodayCount = new Set(todayLogs?.map(log => log.user_id)).size || 0

  // Get recent signups (last 10)
  const { data: recentUsers } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { name: 'Total Users', value: userCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Active Today', value: activeTodayCount, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Content Generated', value: contentCount || 0, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
    { name: 'Keywords Tracked', value: keywordCount || 0, icon: Tag, color: 'text-green-600', bg: 'bg-green-100' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel — Sovira SEO</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Platform metrics and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} dark:bg-opacity-20`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers?.map((u) => (
                <tr key={u.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{u.plan || 'Free'}</td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/activity`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs">
                      View Activity <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
