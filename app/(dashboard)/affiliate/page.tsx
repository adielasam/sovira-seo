'use client'

import { useState, useEffect } from 'react'
import { Copy, Wallet, Users, ArrowUpRight, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AffiliateDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/affiliate')
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        toast.error(json.error + (json.details ? ': ' + JSON.stringify(json.details) : ''))
        console.error('API Error:', json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCopyLink = () => {
    if (!data?.profile?.referral_code) return
    const link = `${window.location.origin}/?ref=${data.profile.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Affiliate link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(withdrawAmount) < 5000) {
      return toast.error('Minimum withdrawal is ₦5,000')
    }

    setIsWithdrawing(true)
    try {
      const res = await fetch('/api/affiliate/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName
        })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success(json.message)
      setWithdrawAmount('')
      setBankName('')
      setAccountNumber('')
      setAccountName('')
      fetchData() // refresh balance and history
    } catch (e: any) {
      toast.error(e.message || 'Withdrawal failed')
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const balance = data?.profile?.balance_ngn || 0
  const totalEarned = data?.profile?.total_earned_ngn || 0
  const referralsCount = data?.referralsCount || 0
  const withdrawals = data?.withdrawals || []

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-8 h-8 text-blue-500" />
          Affiliate Program
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Share your link and earn 5% on every paid subscription from users you refer!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Available Balance</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Total Earned</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">₦{totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Total Referrals</h3>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{referralsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Link & Instructions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Your Referral Link</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Share this link with your audience. When they sign up and pay for a plan, you will automatically receive 5% of their payment.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F172A] p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <code className="flex-1 text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
                {typeof window !== 'undefined' ? window.location.origin : 'https://sovira.com.ng'}/?ref={data?.profile?.referral_code}
              </code>
              <button
                onClick={handleCopyLink}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                title="Copy Link"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-500" />}
              </button>
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Request Withdrawal</h2>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Amount (Minimum ₦5,000)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₦</span>
                  <input
                    type="number"
                    min="5000"
                    max={balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. GTBank, Access Bank"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="0123456789"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isWithdrawing || balance < 5000}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isWithdrawing ? 'Processing...' : 'Submit Withdrawal'}
              </button>
            </form>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full max-h-[800px]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Withdrawal History</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No withdrawal history yet.</p>
              </div>
            ) : (
              withdrawals.map((w: any) => (
                <div key={w.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">₦{w.amount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${w.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        w.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p>{w.bank_name}</p>
                    <p className="font-mono">{w.account_number}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
