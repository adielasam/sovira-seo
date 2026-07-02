'use client'

import { useState, useEffect } from 'react'
import { Globe, Search, FileDown, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, Code, FileText, Share2, Shield, Settings, Eye, Zap, Type, Activity, EyeOff, LayoutTemplate } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { PaywallBlur } from '@/components/ui/paywall-blur'

interface AuditResult {
  id: string;
  scores: Record<string, number>;
  issues: Record<string, any[]>;
  previousScores?: Record<string, number>;
}

const CATEGORY_MAP: Record<string, { label: string, icon: any }> = {
  technical: { label: 'Technical SEO', icon: Settings },
  speed: { label: 'Website speed', icon: Zap },
  onPage: { label: 'On-page', icon: LayoutTemplate },
  aiReadability: { label: 'AI-readability', icon: Eye },
  content: { label: 'Content quality', icon: FileText },
  analytics: { label: 'Analytics / Tech', icon: Activity },
  social: { label: 'Social networks', icon: Share2 },
  accessibility: { label: 'Accessibility', icon: Type },
  privacy: { label: 'Privacy & Cookies', icon: Shield },
  overall: { label: 'Overall', icon: Globe },
}

function ScoreRing({ score, label, icon: Icon, delta, isLarge = false, onClick }: any) {
  const radius = isLarge ? 60 : 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  let colorClass = 'text-green-500'
  if (score < 80) colorClass = 'text-orange-500'
  if (score < 50) colorClass = 'text-red-500'

  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-[#1E293B] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 transition-all cursor-pointer hover:shadow-md hover:ring-blue-500/50 group ${isLarge ? 'col-span-full md:col-span-1 row-span-2' : ''}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Background Ring */}
        <svg className={`transform -rotate-90 ${isLarge ? 'w-40 h-40' : 'w-24 h-24'}`}>
          <circle
            cx={isLarge ? 80 : 48}
            cy={isLarge ? 80 : 48}
            r={radius}
            stroke="currentColor"
            strokeWidth={isLarge ? 8 : 4}
            fill="transparent"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Progress Ring */}
          <circle
            cx={isLarge ? 80 : 48}
            cy={isLarge ? 80 : 48}
            r={radius}
            stroke="currentColor"
            strokeWidth={isLarge ? 8 : 4}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${colorClass} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`${isLarge ? 'text-4xl' : 'text-xl'} font-bold text-slate-900 dark:text-white`}>{score}%</span>
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      
      {delta !== undefined && (
        <div className={`mt-1 text-xs font-medium ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : ''} {Math.abs(delta)}% since last scan
        </div>
      )}
    </div>
  )
}

export default function AuditPage() {
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [isAgency, setIsAgency] = useState(false)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [generated, setGenerated] = useState<Record<string, string>>({})

  const handleGenerate = async (type: string, contextContext: string = '') => {
    if (!isPro) {
      window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: 'This AI feature requires a Pro plan.' } }))
      return
    }
    setGenerating(prev => ({ ...prev, [type]: true }))
    try {
      const res = await fetch('/api/generate/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url, context: contextContext })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error)
      setGenerated(prev => ({ ...prev, [type]: data.result }))
      toast.success('Generated successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }))
    }
  }

  useEffect(() => {
    const checkPlan = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
        const plan = profile?.plan || 'free'
        setIsPro(['pro', 'agency'].includes(plan))
        setIsAgency(plan === 'agency')
      }
    }
    checkPlan()
  }, [])

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return toast.error('Please enter a URL to audit')
    
    setIsAuditing(true)
    setResult(null)
    setActivePanel(null)

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'LIMIT_REACHED') {
          window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: data.message } }))
          return
        }
        throw new Error(data.error || 'Audit failed')
      }
      setResult(data)
      toast.success('Audit completed!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsAuditing(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SEO Audit Engine</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Deep on-page, technical, and AI-readability analysis.</p>
      </div>

      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={handleRunAudit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              required
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px]"
          >
            {isAuditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {isAuditing ? 'Analyzing...' : 'Run Audit'}
          </button>
        </form>
      </div>

      {isAuditing && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Running deep site analysis...</h2>
          <p className="text-sm text-slate-500">Scanning DOM elements, schemas, and meta tags.</p>
        </div>
      )}

      {result && !isAuditing && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Scores for <span className="text-blue-500">{url}</span></h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <ScoreRing 
              score={result.scores.overall} 
              label="Overall Score" 
              icon={CATEGORY_MAP.overall.icon} 
              isLarge={true} 
              delta={result.previousScores?.overall ? result.scores.overall - result.previousScores.overall : undefined}
            />
            {Object.keys(result.scores).filter(k => k !== 'overall').map((key) => {
               const cat = CATEGORY_MAP[key]
               if (!cat) return null
               const delta = result.previousScores?.[key] ? result.scores[key] - result.previousScores[key] : undefined
               return (
                 <ScoreRing 
                   key={key} 
                   score={result.scores[key]} 
                   label={cat.label} 
                   icon={cat.icon}
                   delta={delta}
                   onClick={() => setActivePanel(key)}
                 />
               )
            })}
          </div>

          {/* Render Active Panel Below */}
          {activePanel && result.issues[activePanel] && (
             <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {(() => { const Icon = CATEGORY_MAP[activePanel]?.icon; return Icon ? <Icon className="w-6 h-6 text-blue-500" /> : null })()}
                    {CATEGORY_MAP[activePanel]?.label} Diagnostics
                  </h3>
                  <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>
                
                {result.issues[activePanel].length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p>Perfect score! No issues found in this category.</p>
                  </div>
                ) : (
                  <PaywallBlur isPro={isPro}>
                  <div className="space-y-6">
                    <ul className="space-y-4">
                      {result.issues[activePanel].map((issue, idx) => (
                        <li key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col gap-3">
                          <div className="flex items-start gap-4">
                            {issue.type === 'critical' ? <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" /> : issue.type === 'info' ? <Info className="w-5 h-5 text-blue-500 mt-1 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-orange-500 mt-1 shrink-0" />}
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-white">{issue.title}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{issue.description}</p>
                            </div>
                          </div>
                          {issue.fix && (
                            <div className="ml-9 mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{issue.fix}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    
                    {/* Action Buttons based on Panel */}
                    {activePanel === 'onPage' && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => handleGenerate('meta', 'Extract from DOM if possible')}
                          disabled={generating['meta']}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
                        >
                          {generating['meta'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          Generate Meta Description
                        </button>
                        {generated['meta'] && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Generated Output:</h5>
                            <p className="text-sm text-slate-900 dark:text-white">{generated['meta']}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activePanel === 'aiReadability' && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 relative">
                        {!isPro && (
                          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-[2px] flex items-center justify-center rounded-lg">
                             <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 text-center">
                               <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                               <h4 className="font-bold">AI Schema Generator</h4>
                               <p className="text-xs text-slate-500 mb-3">Upgrade to Pro to auto-generate JSON-LD.</p>
                               <button onClick={() => window.dispatchEvent(new CustomEvent('show-upgrade-modal', {}))} className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded-md font-medium">Upgrade</button>
                             </div>
                          </div>
                        )}
                        <button 
                          onClick={() => handleGenerate('schema', 'Website')}
                          disabled={generating['schema']}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
                        >
                          {generating['schema'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                          Generate JSON-LD Schema
                        </button>
                        {generated['schema'] && (
                          <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700 overflow-x-auto">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Next.js Snippet:</h5>
                            <pre className="text-xs text-green-400"><code>{generated['schema']}</code></pre>
                          </div>
                        )}
                      </div>
                    )}

                    {activePanel === 'social' && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleGenerate('og', 'WebSite')}
                            disabled={generating['og']}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex-1 justify-center"
                          >
                            {generating['og'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Generate OG Tags
                          </button>
                          <button 
                            onClick={() => handleGenerate('og-image', 'Brand colors')}
                            disabled={generating['og-image']}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex-1 justify-center"
                          >
                            {generating['og-image'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            Generate OG Image
                          </button>
                        </div>
                        {generated['og'] && (
                          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 overflow-x-auto">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">OG Tags (JSON):</h5>
                            <pre className="text-xs text-blue-400"><code>{generated['og']}</code></pre>
                          </div>
                        )}
                        {generated['og-image'] && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Generated OpenGraph Image:</h5>
                            <img src={generated['og-image']} alt="Generated OG" className="w-full h-auto rounded-md shadow-sm border border-slate-200 dark:border-slate-700" />
                            <p className="text-xs text-slate-500 mt-2">Deploy at <code className="text-pink-500">/public/og/default.png</code></p>
                          </div>
                        )}
                      </div>
                    )}

                    {activePanel === 'privacy' && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => handleGenerate('privacy', 'Vercel, React')}
                          disabled={generating['privacy']}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
                        >
                          {generating['privacy'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          Generate Privacy Policy (MDX)
                        </button>
                        {generated['privacy'] && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-slate-900 dark:text-white whitespace-pre-wrap">{generated['privacy']}</pre>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activePanel === 'technical' && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                        <div className="flex-1">
                          <button 
                            onClick={() => {
                              if (!isAgency) {
                                window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: 'One-click GitHub deployment requires an Agency plan.' } }))
                                return
                              }
                              toast.error('GitHub integration coming soon!')
                            }}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm w-full justify-center"
                          >
                            <Code className="w-4 h-4" />
                            Push Fixes to GitHub
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  </PaywallBlur>
                )}
             </div>
          )}

        </div>
      )}
    </div>
  )
}
