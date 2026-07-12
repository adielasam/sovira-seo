'use client'

import { useState } from 'react'
import { Bot, Copy, Check, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function GeoPage() {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState('General Information Retrieval')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text) {
      toast.error('Please enter the content to optimize')
      return
    }

    setIsGenerating(true)
    setContent('')

    try {
      const res = await fetch('/api/generate/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, focus })
      })
      const data = await res.json()
      
      if (res.ok && data.result) {
        setContent(data.result)
        toast.success('Optimized successfully')
      } else {
        toast.error(data.error || 'Failed to optimize')
      }
    } catch (error) {
      toast.error('An error occurred while optimizing')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-500" />
          AI Search Optimization (GEO)
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Optimize your content to be recommended by ChatGPT, Gemini, and Perplexity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Draft Content
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your blog post or article here..."
                rows={10}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            <div>
              <label htmlFor="focus" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Optimization Focus
              </label>
              <select
                id="focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option>General Information Retrieval</option>
                <option>Product Recommendation</option>
                <option>Tutorial / Step-by-Step</option>
                <option>Data & Statistics Sourcing</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
              {isGenerating ? 'Optimizing...' : 'Optimize for AI'}
            </button>
          </form>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col h-[700px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Optimized Result
            </h3>
          </div>
          
          <div className="flex-1 p-0 overflow-hidden bg-white dark:bg-[#1E293B] relative">
            {!content && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4 p-6">
                <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p>Paste your content to see how to optimize it for AI engines.</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
                  Restructuring for LLMs...
                </p>
              </div>
            ) : (
              <div className="h-full w-full p-6 overflow-y-auto prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-[#0F172A] rounded-b-xl">
            <button 
              disabled={!content || isGenerating}
              onClick={handleCopy}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Result'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
