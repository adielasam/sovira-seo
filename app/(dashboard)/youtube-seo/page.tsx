'use client'

import { useState } from 'react'
import { PlaySquare, Copy, Check, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function YouTubeSeoPage() {
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [type, setType] = useState('description')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic) {
      toast.error('Please enter a topic or title')
      return
    }

    setIsGenerating(true)
    setContent('')

    try {
      const res = await fetch('/api/generate/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, topic, keywords })
      })
      const data = await res.json()
      
      if (res.ok && data.result) {
        setContent(data.result)
        toast.success('Generated successfully')
      } else {
        toast.error(data.error || 'Failed to generate')
      }
    } catch (error) {
      toast.error('An error occurred while generating')
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
          <PlaySquare className="w-8 h-8 text-red-500" />
          YouTube SEO Tools
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate highly optimized video descriptions and viral scripts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Video Topic or Title
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to grow on YouTube in 2026"
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Target Keywords (Optional)
              </label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. youtube seo, channel growth, algorithm"
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                What do you want to generate?
              </label>
              <div className="space-y-3">
                <label className={`
                  flex items-center px-4 py-3 border rounded-lg cursor-pointer transition-colors
                  ${type === 'description' 
                    ? 'bg-red-50 border-red-600 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="description" 
                    checked={type === 'description'}
                    onChange={() => setType('description')}
                    className="sr-only" 
                  />
                  <div>
                    <p className="font-semibold text-sm">Optimized Description</p>
                    <p className="text-xs mt-0.5 opacity-80">Includes timestamps & keyword-rich paragraphs.</p>
                  </div>
                </label>

                <label className={`
                  flex items-center px-4 py-3 border rounded-lg cursor-pointer transition-colors
                  ${type === 'script' 
                    ? 'bg-red-50 border-red-600 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="script" 
                    checked={type === 'script'}
                    onChange={() => setType('script')}
                    className="sr-only" 
                  />
                  <div>
                    <p className="font-semibold text-sm">Viral Video Script</p>
                    <p className="text-xs mt-0.5 opacity-80">High retention hook, intro, and storyboard.</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <PlaySquare className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Now'}
            </button>
          </form>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col h-[700px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Output
            </h3>
          </div>
          
          <div className="flex-1 p-0 overflow-hidden bg-white dark:bg-[#1E293B] relative">
            {!content && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4 p-6">
                <PlaySquare className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p>Fill out the form on the left to generate YouTube content.</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
                <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
                  Analyzing YouTube algorithm...
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
