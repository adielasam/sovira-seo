import { createClient } from '@/lib/supabase/server'
import { Download, Search, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      user_profiles ( email, full_name )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage billing and active plans.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="w-4 h-4" />
            Sync Paystack
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500">Monthly Recurring Revenue (MRR)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">₦0.00</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500">Active Paid Subs</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{subscriptions?.filter(s => s.status === 'active' && s.plan_name !== 'free').length || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500">Total Subscriptions</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{subscriptions?.length || 0}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search references or emails..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Paystack Ref</th>
                <th className="px-6 py-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions?.map((sub) => (
                <tr key={sub.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {sub.user_profiles?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 capitalize font-semibold">{sub.plan_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{sub.paystack_reference || 'N/A'}</td>
                  <td className="px-6 py-4">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
              {(!subscriptions || subscriptions.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">No subscriptions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
