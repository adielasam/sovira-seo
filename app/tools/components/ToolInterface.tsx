'use client'

import { useState } from 'react'
import { Sparkles, Copy, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ToolInterfaceProps {
  title: string;
  description: string;
  action: string;
  inputPlaceholder: string;
  buttonText: string;
  isTextArea?: boolean;
}

export function ToolInterface({ title, description, action, inputPlaceholder, buttonText, isTextArea = true }: ToolInterfaceProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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
        body: JSON.stringify({ action, text: input })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      
      setOutput(data.result)
      toast.success('Generated successfully!')
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
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          {title}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white dark:bg-[#1E293B] p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        
        {/* Input Section */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your Input</label>
            <span className="text-xs text-slate-400">{input.length} characters</span>
          </div>
          {isTextArea ? (
            <textarea
              className="w-full flex-grow min-h-[300px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-slate-800 dark:text-slate-200"
              placeholder={inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="w-full p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-800 dark:text-slate-200"
              placeholder={inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          )}
          
          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isLoading ? 'Processing...' : buttonText}
          </button>
        </div>

        {/* Output Section */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">AI Output</label>
            {output && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div className="w-full flex-grow min-h-[300px] p-4 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 relative overflow-y-auto whitespace-pre-wrap">
            {output ? output : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50">
                <ArrowRight className="w-12 h-12 mb-2 hidden lg:block" />
                <p>Output will appear here</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
