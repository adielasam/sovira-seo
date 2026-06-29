'use client'

import { useState } from 'react'
import { Sparkles, FileText, Target, List, Layout, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateBriefAction } from '../actions'
import { useRouter } from 'next/navigation'

export default function ContentBriefsPage() {
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [brief, setBrief] = useState<any>(null)
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic) {
      toast.error('Please enter a topic or keyword')
      return
    }

    setIsGenerating(true)
    setBrief(null)
    try {
      const result = await generateBriefAction(topic)
      if (result.error) {
        if (result.error === 'LIMIT_REACHED') {
          window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: result.message } }))
        } else {
          toast.error(result.error)
        }
        setIsGenerating(false)
        return
      }
      
      if (result.data) {
        setBrief(result.data)
        toast.success('SEO Brief generated successfully')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SEO Content Briefs</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate AI-powered structured outlines and keyword strategies before drafting.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Target Keyword / Topic
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Best SaaS Marketing Strategies"
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating Brief...' : 'Generate Brief'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> What's in a brief?
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Optimized H1 Titles</li>
              <li>Compelling Meta Descriptions</li>
              <li>Structured Headings (H2/H3)</li>
              <li>LSI & Semantic Keywords</li>
              <li>Target Word Counts</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col min-h-[600px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Brief Output
            </h3>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-[#1E293B]">
            {!brief && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Layout className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p>Your generated SEO brief will appear here.</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                  Analyzing SERPs and extracting strategy...
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* H1 & Meta */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 mb-1 block tracking-wider">H1 Title</span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                      {brief.h1}
                    </h2>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-wider">Meta Description</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                      {brief.metaDescription}
                    </p>
                    <div className="mt-2 text-xs text-slate-500 text-right">
                      {brief.metaDescription?.length || 0} / 160 characters
                    </div>
                  </div>
                </div>

                {/* Target Word Count */}
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-200">Target Word Count:</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">~{brief.targetWordCount} words</span>
                </div>

                {/* LSI Keywords */}
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4" /> LSI & Semantic Keywords
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {brief.lsiKeywords?.map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-full border border-slate-200 dark:border-slate-700">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Outline */}
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 mb-4 block tracking-wider flex items-center gap-2">
                    <List className="w-4 h-4" /> Recommended Outline
                  </span>
                  <div className="bg-slate-50 dark:bg-[#0F172A] rounded-lg border border-slate-200 dark:border-slate-700 p-5">
                    <ul className="space-y-3">
                      {brief.headings?.map((h: any, i: number) => (
                        <li 
                          key={i} 
                          className={`flex items-start gap-3 ${h.level === 'H3' ? 'ml-6 text-slate-600 dark:text-slate-400 text-sm' : 'text-slate-900 dark:text-slate-200 font-medium'}`}
                        >
                          <span className="mt-0.5 text-xs font-mono font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                            {h.level}
                          </span>
                          {h.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
