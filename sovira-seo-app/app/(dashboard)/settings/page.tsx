'use client'

import { useState, useEffect } from 'react'
import { User, CreditCard, Bell, Key, Settings as SettingsIcon, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getUserProfile, updateUserPlan, deleteAccountAction } from './actions'

export default function SettingsPage() {
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // Read the tab from the URL query params without triggering Next.js Suspense warnings
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab) setActiveTab(tab)
    }
  }, [])

  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const data = await getUserProfile()
      if (data.user) setUser(data.user)
      if (data.profile) setProfile(data.profile)
    }
    fetchUser()
  }, [])

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action is irreversible and all your data will be permanently lost.')) {
      return
    }
    
    setIsDeleting(true)
    const { error } = await deleteAccountAction()
    setIsDeleting(false)
    
    if (error) {
      toast.error(error)
    } else {
      toast.success('Account successfully deleted.')
      router.push('/auth/login')
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Settings saved successfully')
    }, 1000)
  }

  const handleUpgrade = async (planName: string, planAmount: number) => {
    if (!user) {
      toast.error('Please log in to upgrade')
      return
    }
    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      toast.error('Paystack key not configured')
      return
    }
    
    try {
      const PaystackPop = (await import('@paystack/inline-js')).default
      const paystack = new PaystackPop()
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: planAmount * 100, // in kobo
        currency: 'NGN',
        reference: 'SOVIRA_' + Date.now(),
        onSuccess: async (transaction: any) => {
          toast.loading('Verifying payment...')
          const res = await updateUserPlan(transaction.reference, planName)
          toast.dismiss()
          if (res.error) {
            toast.error(res.error)
          } else {
            toast.success('Payment successful! Plan upgraded.')
            setProfile({ ...profile, plan: planName })
            router.refresh()
          }
        },
        onCancel: () => {
          console.log('Payment closed')
        }
      })
    } catch (err) {
      console.error('Paystack error:', err)
      toast.error('Failed to initialize payment gateway')
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your account settings, billing, and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <User className="w-5 h-5" />
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'billing' 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Billing & Plans
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications' 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Bell className="w-5 h-5" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'security' 
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-5 h-5" />
            Security
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Profile Details</h3>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <button type="button" className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Change Avatar
                    </button>
                    <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. 1MB max.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input type="text" defaultValue={profile?.full_name || ''} className="block w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input type="email" defaultValue={user?.email || ''} className="block w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed" disabled />
                  <p className="text-xs text-slate-500 mt-1.5">Contact support to change your email address.</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Current Plan</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{profile?.plan || 'Free'} Plan</h4>
                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">Manage your subscription and billing details.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Starter Plan */}
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 ring-1 ring-slate-200 dark:ring-slate-800 text-center flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 hover:ring-blue-200 dark:hover:ring-blue-900 group cursor-pointer">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">Starter</h4>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">₦10,000<span className="text-sm font-normal text-slate-500">/mo</span></p>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 mb-6 space-y-2 text-left flex-1">
                    <p className="flex items-center gap-2"><span className="text-blue-500">✓</span> 50 Keywords Tracked</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">✓</span> 50 SEO Audits/mo</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">✓</span> 10,000 AI Words</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500">✓</span> 1 AI Video & 15 Images</p>
                  </div>
                  <button onClick={() => handleUpgrade('starter', 10000)} className="w-full px-4 py-2 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-all duration-300 group-hover:bg-blue-50 group-hover:text-blue-700 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400">
                    {profile?.plan === 'starter' ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 ring-2 ring-blue-500 text-center relative flex flex-col h-full shadow-lg shadow-blue-500/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 group cursor-pointer scale-100 hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-blue-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-pulse">
                    POPULAR
                  </div>
                  <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400">Pro</h4>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">₦30,000<span className="text-sm font-normal text-slate-500">/mo</span></p>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 mb-6 space-y-2 text-left flex-1">
                    <p className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span> 500 Keywords Tracked</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span> Unlimited SEO Audits</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span> 100,000 AI Words</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span> 3 AI Videos & 100 Images</p>
                    <p className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span> 1-Click CMS Publishing</p>
                  </div>
                  <button onClick={() => handleUpgrade('pro', 30000)} className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-blue-500/30 active:scale-95">
                    {profile?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                  </button>
                </div>

                {/* Agency Plan */}
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 ring-1 ring-slate-200 dark:ring-slate-800 text-center flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:ring-purple-200 dark:hover:ring-purple-900 group cursor-pointer">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">Agency</h4>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">₦130,000<span className="text-sm font-normal text-slate-500">/mo</span></p>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 mb-6 space-y-2 text-left flex-1">
                    <p className="flex items-center gap-2"><span className="text-purple-500">✓</span> 5,000 Keywords Tracked</p>
                    <p className="flex items-center gap-2"><span className="text-purple-500">✓</span> Unlimited SEO Audits</p>
                    <p className="flex items-center gap-2"><span className="text-purple-500">✓</span> Unlimited AI Words</p>
                    <p className="flex items-center gap-2"><span className="text-purple-500">✓</span> 15 AI Videos & 500 Images</p>
                    <p className="flex items-center gap-2"><span className="text-purple-500">✓</span> Custom White-labeling</p>
                  </div>
                  <button onClick={() => handleUpgrade('agency', 130000)} className="w-full px-4 py-2 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-all duration-300 group-hover:bg-purple-50 group-hover:text-purple-700 dark:group-hover:bg-purple-900/30 dark:group-hover:text-purple-400">
                    {profile?.plan === 'agency' ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Bell className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Notification Preferences</h3>
              <p className="text-slate-500 max-w-sm">Manage how you receive alerts for ranking changes, audits, and billing updates.</p>
              <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors">
                Configure Alerts
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Security Settings</h3>
              </div>
              
              <div className="p-6 max-w-md space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="p-6">
                  <div className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      Irreversible actions. Please proceed with caution.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">Delete Account</h4>
                        <p className="text-sm text-slate-500 mt-0.5">Permanently remove your account and all associated data</p>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-red-200 hover:border-red-300 dark:border-red-900/50 dark:hover:border-red-900 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                      >
                        {isDeleting ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Delete Account'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
