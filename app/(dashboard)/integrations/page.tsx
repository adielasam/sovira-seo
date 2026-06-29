'use client'

import { useState, useEffect } from 'react'
import { Plug, CheckCircle2, Link as LinkIcon, Unlink, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCmsIntegration, connectWordPress, disconnectCms } from './actions'

export default function IntegrationsPage() {
  const [provider, setProvider] = useState<'wordpress' | 'webflow' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState<string | null>(null)
  
  // WordPress Form State
  const [wpUrl, setWpUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpAppPassword, setWpAppPassword] = useState('')
  const [showWpForm, setShowWpForm] = useState(false)

  useEffect(() => {
    const loadIntegration = async () => {
      const { data } = await getCmsIntegration()
      if (data && data.cms_provider) {
        setProvider(data.cms_provider as any)
      }
      setIsLoading(false)
    }
    loadIntegration()
  }, [])

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
      setShowWpForm(false)
      toast.success('Successfully connected to WordPress!')
    } else {
      toast.error(error || 'Failed to connect.')
    }
    setIsActioning(null)
  }

  const handleDisconnect = async () => {
    if (!provider) return
    setIsActioning('disconnect')
    const { success, error } = await disconnectCms()
    
    if (success) {
      setProvider(null)
      toast.success('CMS disconnected successfully.')
    } else {
      toast.error(error || 'Failed to disconnect.')
    }
    setIsActioning(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CMS Integrations</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Connect your website to publish content directly from Sovira SEO.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WordPress */}
        <div className={`bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ${provider === 'wordpress' ? 'ring-blue-500' : 'ring-slate-200 dark:ring-slate-800'} relative overflow-hidden transition-all`}>
          {provider === 'wordpress' && (
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              CONNECTED
            </div>
          )}
          
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.05-.18 2.986-.51-.024-.037-.046-.078-.071-.117l-2.757-7.578zM2.542 12c0-3.905 2.373-7.25 5.795-8.67l-3.327 9.176C3.398 11.83 2.542 11.847 2.542 12zm2.083-9.172c2.096-1.572 4.673-2.508 7.46-2.508 6.627 0 12 5.373 12 12 0 2.213-.598 4.288-1.637 6.064l-3.56-9.794c.338-1.025.5-1.92.5-2.69 0-1.29-.444-2.227-.852-2.915-.65-.99-1.28-1.556-1.28-2.39 0-.916.716-1.76 1.77-1.76h.142c-2.09-1.89-4.853-3.047-7.873-3.047-3.414 0-6.495 1.442-8.67 3.754zM22 12c0 .94-.108 1.854-.314 2.735l-3.385-9.308c-.08-.094-.17-.184-.27-.267.893 1.258 1.42 2.806 1.42 4.475 0 .61-.065 1.205-.188 1.777l2.557 7.03C21.905 13.882 22 12.955 22 12zM12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">WordPress</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Export drafts directly to your WordPress site as Posts or Pages.</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <button disabled className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium w-full flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </button>
            ) : provider === 'wordpress' ? (
              <button 
                onClick={handleDisconnect}
                disabled={isActioning !== null}
                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isActioning === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Disconnect
              </button>
            ) : showWpForm ? (
              <form onSubmit={handleConnectWordPress} className="space-y-3 mt-2">
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={wpUrl}
                  onChange={e => setWpUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="WordPress Username"
                  value={wpUsername}
                  onChange={e => setWpUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Application Password"
                  value={wpAppPassword}
                  onChange={e => setWpAppPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWpForm(false)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isActioning !== null}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isActioning === 'wordpress' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setShowWpForm(true)}
                disabled={isActioning !== null || provider === 'webflow'}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LinkIcon className="w-4 h-4" />
                Connect Credentials
              </button>
            )}
          </div>
        </div>

        {/* Webflow */}
        <div className={`bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ${provider === 'webflow' ? 'ring-blue-500' : 'ring-slate-200 dark:ring-slate-800'} relative overflow-hidden transition-all`}>
          {provider === 'webflow' && (
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              CONNECTED
            </div>
          )}
          
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.945 20.301l-4.148-12.02L8.71 19.86l-6.195-6.732 1.341-1.22 4.792 5.207 3.96-11.455 4.316 12.502 2.56-5.83 1.636.718-3.175 7.251h-1.002z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Webflow</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Publish content straight to your Webflow CMS collections.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isLoading ? (
              <button disabled className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium w-full flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </button>
            ) : provider === 'webflow' ? (
              <button 
                onClick={handleDisconnect}
                disabled={isActioning !== null}
                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isActioning === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Disconnect
              </button>
            ) : (
              <button 
                onClick={() => toast.error('Webflow integration is temporarily disabled. Please use WordPress.')}
                disabled={isActioning !== null || provider === 'wordpress'}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
