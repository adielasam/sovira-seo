'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Copy, CheckCircle2, Loader2, Shield, Crown, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardHumanizerPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [plan, setPlan] = useState<string>('free')
  const [loadingPlan, setLoadingPlan] = useState(true)

  const FREE_LIMIT = 700
  const isPaid = plan === 'starter' || plan === 'pro' || plan === 'agency'
  const maxChars = isPaid ? undefined : FREE_LIMIT

  useEffect(() => {
    async function fetchPlan() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        if (profile?.plan) {
          setPlan(profile.plan === 'free trial' ? 'free' : profile.plan)
        }
      }
      setLoadingPlan(false)
    }
    fetchPlan()
  }, [])

  const handleInputChange = (value: string) => {
    if (maxChars && value.length > maxChars) {
      setInput(value.slice(0, maxChars))
      toast.error(`Free plan limit: ${FREE_LIMIT} characters. Upgrade to Starter for unlimited!`)
      return
    }
    setInput(value)
  }

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error('Please enter some text first.')
      return
    }

    setIsLoading(true)
    setOutput('')
    
    try {
      const res = await fetch('/api/tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'humanize', text: input })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      
      setOutput(data.result)
      toast.success('Text humanized successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-500" />
            AI Text Humanizer
          </h1>
          <p className="text-slate-500 mt-1">
            Bypass Turnitin, GPTZero, ZeroGPT & all AI detectors. Rewrite AI text to sound 100% human.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Crown className="w-3.5 h-3.5" />
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Unlimited
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
              <Lock className="w-3.5 h-3.5" />
              Free Plan — {FREE_LIMIT} char limit
            </span>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Paste AI Text</label>
            <span className={`text-xs ${maxChars && input.length >= FREE_LIMIT * 0.9 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
              {input.length}{maxChars ? `/${maxChars}` : ''} characters
            </span>
          </div>
          <textarea
            className="w-full flex-grow min-h-[350px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none text-slate-800 dark:text-slate-200"
            placeholder="Paste your AI-generated text here (ChatGPT, Claude, Gemini, etc.)..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            maxLength={maxChars}
          />

          {/* Upgrade CTA for free users */}
          {!isPaid && input.length >= FREE_LIMIT * 0.8 && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Free limit: {FREE_LIMIT} characters. <Link href="/settings" className="font-bold underline hover:text-amber-900">Upgrade to Starter</Link> for unlimited humanization with our stealth AI engine.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {isLoading ? 'Humanizing...' : 'Humanize Text'}
          </button>
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Humanized Output</label>
            {output && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div className="w-full flex-grow min-h-[350px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 overflow-y-auto whitespace-pre-wrap relative">
            {output ? output : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50">
                <Shield className="w-12 h-12 mb-2" />
                <p>Humanized text will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">🛡️ How our Stealth Humanizer works</h3>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
          Our 10-point stealth rewriting engine applies genuine writing craft — sentence length variation, active verbs over nominalizations, natural asides, varied citation styles, spoken rhythm with dashes, strategic imperfections, and paragraph variation — to make text read as authentically human-written prose that passes Turnitin, GPTZero, ZeroGPT, Originality.ai, and Copyleaks.
        </p>
      </div>
    </div>
  )
}
