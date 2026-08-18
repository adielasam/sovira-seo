'use client'

import { useState, useEffect } from 'react'
import { Check, X, Loader2, Landmark, Copy, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminAffiliates() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/admin/affiliates')
      if (res.ok) {
        const json = await res.json()
        setWithdrawals(json.withdrawals || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const handleAction = async (id: string, action: 'pay' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return

    setProcessingId(id)
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success(json.message)
      fetchWithdrawals()
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action}`)
    } finally {
      setProcessingId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const pending = withdrawals.filter(w => w.status === 'pending')
  const completed = withdrawals.filter(w => w.status !== 'pending')

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Landmark className="w-8 h-8 text-blue-500" />
          Affiliate Withdrawals
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage affiliate payout requests. Manually transfer funds to their bank accounts, then mark as Paid.
        </p>
      </div>

      <div className="space-y-8">
        {/* Pending Requests */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
            Pending Action ({pending.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pending.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 flex flex-col items-center">
                <Check className="w-12 h-12 mb-2 text-emerald-500 opacity-50" />
                <p>No pending withdrawal requests. You are all caught up!</p>
              </div>
            ) : (
              pending.map((w: any) => (
                <div key={w.id} className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">₦{w.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold uppercase rounded">
                      Pending
                    </span>
                  </div>

                  <div className="space-y-3 mb-6 bg-slate-50 dark:bg-[#0F172A] p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Affiliate</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {w.affiliate_profiles?.user_profiles?.[0]?.full_name || w.affiliate_profiles?.user_profiles?.[0]?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Ref: {w.affiliate_profiles?.referral_code}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bank Details</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-white dark:bg-[#1E293B] p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-xs text-slate-500">Bank</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{w.bank_name}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-[#1E293B] p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-xs text-slate-500">Account No</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{w.account_number}</span>
                            <button onClick={() => copyToClipboard(w.account_number)} className="text-blue-500 hover:text-blue-600"><Copy className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-[#1E293B] p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-xs text-slate-500">Name</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{w.account_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(w.id, 'pay')}
                      disabled={processingId === w.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {processingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Mark Paid
                    </button>
                    <button
                      onClick={() => handleAction(w.id, 'reject')}
                      disabled={processingId === w.id}
                      className="px-4 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Reject & Refund"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* History */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-slate-400" />
              Processing History
            </h2>
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-medium">Affiliate</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Bank Details</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {completed.map((w: any) => (
                      <tr key={w.id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {w.affiliate_profiles?.user_profiles?.[0]?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-slate-500">Ref: {w.affiliate_profiles?.referral_code}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">₦{w.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs">
                          <p>{w.bank_name}</p>
                          <p className="font-mono text-slate-500">{w.account_number}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${w.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(w.processed_at || w.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
