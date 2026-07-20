'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Copy, CheckCircle2, Loader2, Shield, Crown, Lock, RefreshCw, Scan } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DetectionResult {
  overallScore: number
  verdict: 'human' | 'mixed' | 'ai'
  flaggedIndices: number[]
  sentenceScores: number[]
  sentences: string[]
}

function DetectionGauge({ score, verdict }: { score: number; verdict: string }) {
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const bgColor = score >= 85 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
    : score >= 50 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  const label = score >= 85 ? 'Looks Human' : score >= 50 ? 'Needs Work' : 'Flagged as AI'
  const labelColor = score >= 85 ? 'text-emerald-600 dark:text-emerald-400' 
    : score >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className={`rounded-2xl border p-5 flex flex-col items-center ${bgColor}`}>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Detection Score</p>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{score}%</span>
          <span className="text-[10px] font-medium text-slate-500">human</span>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1.5 text-sm font-bold ${labelColor}`}>
        {score >= 85 ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        {label}
      </div>
    </div>
  )
}

export default function DashboardHumanizerPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [plan, setPlan] = useState<string>('free')
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [detection, setDetection] = useState<DetectionResult | null>(null)

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

  const runDetection = async (text: string) => {
    setIsScanning(true)
    try {
      const res = await fetch('/api/tools/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (res.ok) {
        setDetection(data)
      }
    } catch (err) {
      console.error('Detection scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error('Please enter some text first.')
      return
    }

    setIsLoading(true)
    setOutput('')
    setDetection(null)
    
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
      
      // Automatically run detection scan on the humanized output
      await runDetection(data.result)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRehumanize = async () => {
    if (!output) return
    setInput(output)
    setOutput('')
    setDetection(null)
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'humanize', text: output })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setOutput(data.result)
      toast.success('Re-humanized successfully!')
      await runDetection(data.result)
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

  // Render output with highlighted flagged sentences
  const renderHighlightedOutput = () => {
    if (!detection || !detection.sentences || detection.sentences.length === 0) {
      return <span>{output}</span>
    }

    return (
      <span>
        {detection.sentences.map((sentence, idx) => {
          const isFlagged = detection.flaggedIndices.includes(idx)
          const score = detection.sentenceScores[idx]
          
          if (isFlagged) {
            return (
              <span
                key={idx}
                className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-b-2 border-red-400 dark:border-red-500 cursor-help px-0.5 rounded-sm"
                title={`AI Score: ${100 - (score || 0)}% — This sentence has AI-like patterns`}
              >
                {sentence}{' '}
              </span>
            )
          }
          return <span key={idx}>{sentence} </span>
        })}
      </span>
    )
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
            className="w-full flex-grow min-h-[350px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
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
                Free limit: {FREE_LIMIT} characters. <Link href="/settings" className="font-bold underline hover:text-amber-900">Upgrade to Starter</Link> for unlimited humanization.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {isLoading ? (isScanning ? 'Scanning for AI...' : 'Humanizing...') : 'Humanize Text'}
          </button>
        </div>

        {/* Output + Detection */}
        <div className="flex flex-col gap-6">
          {/* Detection Score Card */}
          {(detection || isScanning) && (
            <div>
              {isScanning ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 flex flex-col items-center">
                  <Scan className="w-8 h-8 text-blue-500 animate-pulse mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Scanning for AI patterns...</p>
                  <p className="text-xs text-slate-400 mt-1">Analyzing each sentence against 8 detection signals</p>
                </div>
              ) : detection && (
                <DetectionGauge score={detection.overallScore} verdict={detection.verdict} />
              )}
            </div>
          )}

          {/* Humanized Output */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Humanized Output</label>
              <div className="flex items-center gap-3">
                {output && detection && detection.overallScore < 95 && (
                  <button 
                    onClick={handleRehumanize}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Re-humanize
                  </button>
                )}
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
            </div>
            <div className="w-full flex-grow min-h-[250px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 overflow-y-auto text-sm leading-relaxed relative">
              {output ? renderHighlightedOutput() : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50">
                  <Shield className="w-12 h-12 mb-2" />
                  <p>Humanized text will appear here</p>
                </div>
              )}
            </div>

            {/* Legend */}
            {detection && detection.flaggedIndices.length > 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-300"></span>
                  AI-flagged sentence — click Re-humanize to fix
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2">🛡️ How our Stealth Humanizer works</h3>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
          Our 10-point stealth engine rewrites text with genuine writing craft — sentence length variation, active verbs, natural asides, varied citation styles, spoken rhythm with dashes, strategic imperfections, and paragraph variation. After humanizing, we automatically scan the output against 8 AI detection signals and highlight any sentences that still need work. Click <strong>Re-humanize</strong> to improve flagged areas.
        </p>
      </div>
    </div>
  )
}
