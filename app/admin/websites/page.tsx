import { createClient } from '@/lib/supabase/server'
import { Globe, ExternalLink, Play, Pause, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { WebsiteActions } from '@/components/admin/WebsiteActions'

export const dynamic = 'force-dynamic'

export default async function AdminWebsitesPage() {
  const supabase = await createClient()

  // Fetch all index.html files to identify unique websites
  const { data: indexFiles } = await supabase
    .from('content_generations')
    .select('id, user_id, topic, created_at')
    .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
    .like('topic', '%|index.html')
    .order('created_at', { ascending: false })

  // Fetch users to display email and plan
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, email, plan')

  const userMap = new Map(users?.map(u => [u.id, u]) || [])

  const websites = (indexFiles || []).map(file => {
    const slug = file.topic.split('|')[0]
    const isPaused = slug.startsWith('_paused_')
    const actualSlug = isPaused ? slug.replace('_paused_', '') : slug
    const user = userMap.get(file.user_id)
    return {
      id: file.id, // ID of the index.html record
      currentSlug: slug,
      actualSlug,
      url: process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ? `/${actualSlug}/` : `https://${actualSlug}.sovira.com.ng/`,
      isPaused,
      createdAt: file.created_at,
      userId: file.user_id,
      userEmail: user?.email || 'Unknown',
      userPlan: user?.email === 'adielasam2015@gmail.com' ? 'agency' : (user?.plan || 'free')
    }
  })

  const totalSites = websites.length
  const activeSites = websites.filter(w => !w.isPaused).length
  const pausedSites = websites.filter(w => w.isPaused).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hosted Websites</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage and monitor all InstantSites created on the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-opacity-20">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Websites</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSites}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-opacity-20">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Websites</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeSites}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-opacity-20">
              <Pause className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Paused Websites</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{pausedSites}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3">Website Link</th>
                <th className="px-6 py-3">User & Plan</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Published At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {websites.map((site) => (
                <tr key={site.currentSlug} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <a href={site.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      {site.actualSlug}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{site.userEmail}</span>
                      <span className="text-xs text-slate-500 capitalize">{site.userPlan} Plan</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${site.isPaused ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                      {site.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span>{new Date(site.createdAt).toLocaleDateString('en-GB')}</span>
                      <span className="text-xs text-slate-500">
                        {Math.floor(Math.abs(new Date().getTime() - new Date(site.createdAt).getTime()) / (1000 * 60 * 60 * 24)) === 0 
                          ? 'Today' 
                          : \`\${Math.floor(Math.abs(new Date().getTime() - new Date(site.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago\`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`mailto:${site.userEmail}?subject=Regarding your Sovira project: ${site.actualSlug}`} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors">
                        Contact
                      </a>
                      <WebsiteActions 
                        currentSlug={site.currentSlug} 
                        isPaused={site.isPaused} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {websites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No websites have been hosted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
