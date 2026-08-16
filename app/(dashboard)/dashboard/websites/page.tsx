import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Globe, Trash2, Calendar, ShieldAlert } from 'lucide-react'
import { SiteActions } from './SiteActions'

export const metadata = {
  title: 'My Hosted Websites | Sovira SEO',
  description: 'Manage your InstantSites',
}

export default async function SavedWebsitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to check plan
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const isFree = (plan === 'free' || plan === 'free trial') && !user?.email?.toLowerCase().includes('adielasam2015')

  // Fetch unique saved sites from content_generations
  const { data: sites, error } = await supabase
    .from('content_generations')
    .select('id, topic, created_at')
    .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Deduplicate by slug (topic is stored as slug|filename)
  const uniqueSitesMap = new Map()
  if (sites) {
    sites.forEach(site => {
      const slug = site.topic.split('|')[0]
      if (!uniqueSitesMap.has(slug)) {
        uniqueSitesMap.set(slug, site)
      }
    })
  }
  const uniqueSites = Array.from(uniqueSitesMap.values())

  const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sovira.com.ng'
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" /> My Websites
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your deployed InstantSites</p>
        </div>
        <Link href="/html-host" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
          Create New Site
        </Link>
      </div>

      {isFree && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h3 className="text-amber-800 dark:text-amber-400 font-semibold mb-1">Free Tier Limitations</h3>
            <p className="text-amber-700 dark:text-amber-500 text-sm">
              Free users are limited to hosting <strong>1 project</strong> at a time. Free projects are automatically deleted after 7 days of inactivity. <Link href="/pricing" className="underline font-bold hover:text-amber-900">Upgrade to Pro</Link> for unlimited, permanent hosting.
            </p>
          </div>
        </div>
      )}

      {uniqueSites.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Globe className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Websites Hosted</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">You haven't deployed any InstantSites yet.</p>
          <Link href="/html-host" className="text-blue-600 hover:text-blue-700 font-medium">Build your first site →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueSites.map((site) => {
            const slug = site.topic.split('|')[0]
            const url = hostUrl.includes('localhost') ? `http://localhost:3000/${slug}/` : `https://${slug}.sovira.com.ng/`
            
            return (
              <div key={slug} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-lg transition-all group relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <a href={url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1">
                  {slug}
                </h3>
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate block mb-4">
                  {url}
                </a>

                <SiteActions slug={slug} />

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
