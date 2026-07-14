'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Unlink, Loader2, Rss, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCmsIntegration, connectWordPress, disconnectCms, updateAutoPublishSettings } from './actions'

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [provider, setProvider] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState<string | null>(null)
  
  // WordPress Form State
  const [wpUrl, setWpUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpAppPassword, setWpAppPassword] = useState('')
  const [showWpModal, setShowWpModal] = useState(false)

  // Blogger State
  const [bloggerConnected, setBloggerConnected] = useState(false)

  // Auto Publish State
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false)
  const [autoPublishFrequency, setAutoPublishFrequency] = useState('daily')
  const [autoPublishTopics, setAutoPublishTopics] = useState('')
  const [isSavingAutoPublish, setIsSavingAutoPublish] = useState(false)

  useEffect(() => {
    // Check URL for OAuth redirects
    const errorParam = searchParams.get('error')
    const successParam = searchParams.get('success')

    if (errorParam) {
      toast.error(`Auth Error: ${errorParam.replace(/_/g, ' ')}`)
      router.replace('/integrations')
    } else if (successParam === 'blogger_connected') {
      toast.success('Successfully connected Blogger account!')
      router.replace('/integrations')
    }

    const loadIntegration = async () => {
      const { data } = await getCmsIntegration()
      if (data) {
        if (data.cms_provider) setProvider(data.cms_provider)
        if (data.blogger_access_token) {
           setBloggerConnected(true)
           if (data.cms_provider === 'blogger') {
             setProvider('blogger')
           }
        }
        if (data.auto_publish_enabled) setAutoPublishEnabled(data.auto_publish_enabled)
        if (data.auto_publish_frequency) setAutoPublishFrequency(data.auto_publish_frequency)
        if (data.auto_publish_topics) setAutoPublishTopics(data.auto_publish_topics.join(', '))
      }
      setIsLoading(false)
    }
    loadIntegration()
  }, [searchParams, router])

  const handleSaveAutoPublish = async () => {
    if (autoPublishEnabled && !provider && !bloggerConnected) {
      toast.error('You must connect a Blog (WordPress or Blogger) before enabling Auto-Publish.')
      return
    }
    if (autoPublishEnabled && !autoPublishTopics.trim()) {
      toast.error('Please enter at least one topic or keyword for Auto-Publish.')
      return
    }

    setIsSavingAutoPublish(true)
    const { success, error } = await updateAutoPublishSettings(autoPublishEnabled, autoPublishFrequency, autoPublishTopics)
    if (success) {
      toast.success('Auto-Publish settings saved!')
    } else {
      toast.error(error || 'Failed to save settings.')
    }
    setIsSavingAutoPublish(false)
  }

  const handleConnectWordPress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wpUrl || !wpUsername || !wpAppPassword) {
      toast.error('All fields are required')
      return
    }

    setIsActioning('wordpress')
    const { success, error } = await connectWordPress(wpUrl, wpUsername, wpAppPassword)
    
    if (success) {
      setProvider('wordpress')
      setShowWpModal(false)
      toast.success('Successfully connected to WordPress!')
    } else {
      toast.error(error || 'Failed to connect.')
    }
    setIsActioning(null)
  }

  const handleDisconnect = async () => {
    setIsActioning('disconnect')
    const { success, error } = await disconnectCms()
    
    if (success) {
      setProvider(null)
      toast.success('Disconnected successfully.')
    } else {
      toast.error(error || 'Failed to disconnect.')
    }
    setIsActioning(null)
  }

  const platforms = [
    {
      id: 'wordpress',
      name: 'WordPress',
      subtitle: 'Blog',
      icon: <svg className="w-8 h-8 text-[#21759b]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.05-.18 2.986-.51-.024-.037-.046-.078-.071-.117l-2.757-7.578zM2.542 12c0-3.905 2.373-7.25 5.795-8.67l-3.327 9.176C3.398 11.83 2.542 11.847 2.542 12zm2.083-9.172c2.096-1.572 4.673-2.508 7.46-2.508 6.627 0 12 5.373 12 12 0 2.213-.598 4.288-1.637 6.064l-3.56-9.794c.338-1.025.5-1.92.5-2.69 0-1.29-.444-2.227-.852-2.915-.65-.99-1.28-1.556-1.28-2.39 0-.916.716-1.76 1.77-1.76h.142c-2.09-1.89-4.853-3.047-7.873-3.047-3.414 0-6.495 1.442-8.67 3.754zM22 12c0 .94-.108 1.854-.314 2.735l-3.385-9.308c-.08-.094-.17-.184-.27-.267.893 1.258 1.42 2.806 1.42 4.475 0 .61-.065 1.205-.188 1.777l2.557 7.03C21.905 13.882 22 12.955 22 12zM12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"/></svg>,
      action: () => setShowWpModal(true),
      connected: provider === 'wordpress',
      color: 'border-[#21759b]/20 hover:border-[#21759b]/50'
    },
    {
      id: 'blogger',
      name: 'Blogger',
      subtitle: 'Blog',
      icon: <svg className="w-8 h-8 text-[#f57d00]" viewBox="0 0 24 24" fill="currentColor"><path d="M16.8 0H7.2C3.2 0 0 3.2 0 7.2v9.6C0 20.8 3.2 24 7.2 24h9.6c4 0 7.2-3.2 7.2-7.2V7.2C24 3.2 20.8 0 16.8 0zm-2 16.8H8.4c-1.1 0-2-.9-2-2V9.2c0-1.1.9-2 2-2h6.4c1.1 0 2 .9 2 2v1.6c0 1.1-.9 2-2 2h-1.6v1.6h1.6c1.1 0 2 .9 2 2v1.6c0 1.1-.9 2-2 2zM12 10.4c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zm1.6 4.8c-.9 0-1.6-.7-1.6-1.6s.7-1.6 1.6-1.6 1.6.7 1.6 1.6-.7 1.6-1.6 1.6z"/></svg>,
      action: () => { window.location.href = '/api/auth/blogger' },
      connected: provider === 'blogger' || bloggerConnected,
      color: 'border-[#f57d00]/20 hover:border-[#f57d00]/50'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      subtitle: 'Channel',
      icon: <svg className="w-8 h-8 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
      action: () => toast.error('YouTube integration coming soon!'),
      connected: false,
      color: 'border-[#FF0000]/20 hover:border-[#FF0000]/50'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      subtitle: 'Account',
      icon: <svg className="w-8 h-8 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.28 6.28 0 005.4 15.6a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.44-.6z"/></svg>,
      action: () => toast.error('TikTok integration coming soon!'),
      connected: false,
      color: 'border-slate-300 dark:border-slate-700 hover:border-black dark:hover:border-white'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      subtitle: 'Account',
      icon: <svg className="w-8 h-8 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
      action: () => toast.error('LinkedIn integration coming soon!'),
      connected: false,
      color: 'border-[#0a66c2]/20 hover:border-[#0a66c2]/50'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      subtitle: 'Page',
      icon: <svg className="w-8 h-8 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      action: () => toast.error('Facebook integration coming soon!'),
      connected: false,
      color: 'border-[#1877F2]/20 hover:border-[#1877F2]/50'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      subtitle: 'Professional Account',
      icon: <svg className="w-8 h-8 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
      action: () => toast.error('Instagram integration coming soon!'),
      connected: false,
      color: 'border-[#E4405F]/20 hover:border-[#E4405F]/50'
    },
    {
      id: 'threads',
      name: 'Threads',
      subtitle: 'Account',
      icon: <svg className="w-8 h-8 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M14.28 12.1a2.23 2.23 0 00-2.18-2.26 2.23 2.23 0 00-2.28 2.26 2.23 2.23 0 002.28 2.25 2.23 2.23 0 002.18-2.25m3.75 3.32a6.45 6.45 0 01-12 0 6.55 6.55 0 010-6.64 6.47 6.47 0 0110.15-1.12l-1.3 1.34a4.67 4.67 0 00-7 1.34 4.7 4.7 0 000 4.2 4.68 4.68 0 007.49.52 4.64 4.64 0 00.32-6.52A4.14 4.14 0 0012.1 7.92 4.13 4.13 0 007.92 12.1a4.13 4.13 0 004.18 4.18 4.13 4.13 0 003.88-2.61h2a6.04 6.04 0 01-5.88 4.54A6.05 6.05 0 016.05 12.1a6.04 6.04 0 016.05-6.05 6.04 6.04 0 015.93 7.37z"/></svg>,
      action: () => toast.error('Threads integration coming soon!'),
      connected: false,
      color: 'border-slate-300 dark:border-slate-700 hover:border-black dark:hover:border-white'
    }
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Streamline your content distribution and maximize your online presence by connecting your favorite social platforms.
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Auto-publish generated articles, blogs, and videos directly to your connected accounts.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {platforms.map((p) => (
            <div key={p.id} className={`bg-white dark:bg-[#1E293B] flex flex-col items-center justify-center p-8 rounded-2xl shadow-sm border ${p.color} transition-all relative overflow-hidden group`}>
              
              {p.connected && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED
                </div>
              )}

              <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {p.icon}
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{p.subtitle}</p>

              {p.connected ? (
                <button 
                  onClick={handleDisconnect}
                  disabled={isActioning !== null}
                  className="w-full py-2.5 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isActioning === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={p.action}
                  className="w-full py-2.5 rounded-full border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Auto Publish Settings */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 mt-12 transition-all">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Rss className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Auto-Publish Settings</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Configure how Sovira automatically generates and publishes content.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Enable Auto-Publishing</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requires a connected blog platform (WordPress or Blogger).</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={autoPublishEnabled}
                onChange={(e) => setAutoPublishEnabled(e.target.checked)}
                disabled={!provider && !bloggerConnected}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-100 transition-opacity">
            {/* Frequency */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Publish Frequency</label>
              <select 
                value={autoPublishFrequency}
                onChange={e => setAutoPublishFrequency(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Topics & Keywords</label>
              <input 
                type="text" 
                placeholder="e.g. SEO tips, Digital Marketing, Real Estate"
                value={autoPublishTopics}
                onChange={e => setAutoPublishTopics(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of topics the AI should write about.</p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveAutoPublish}
              disabled={isSavingAutoPublish}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSavingAutoPublish ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* WordPress Modal */}
      {showWpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Connect WordPress</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enter your credentials to allow auto-publishing.</p>
            
            <form onSubmit={handleConnectWordPress} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase">WordPress URL</label>
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={wpUrl}
                  onChange={e => setWpUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase">Username</label>
                <input
                  type="text"
                  placeholder="Admin Username"
                  value={wpUsername}
                  onChange={e => setWpUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase">Application Password</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={wpAppPassword}
                  onChange={e => setWpAppPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWpModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isActioning !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isActioning === 'wordpress' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blogger Modal */}
      {showBloggerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Connect Blogger</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Authenticate with your Google account to auto-publish to Blogger.</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => {
                  toast.error('Google OAuth setup required for Blogger API.')
                  setShowBloggerModal(false)
                }}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                Continue with Google
              </button>
              
              <button
                type="button"
                onClick={() => setShowBloggerModal(false)}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <IntegrationsContent />
    </Suspense>
  )
}
