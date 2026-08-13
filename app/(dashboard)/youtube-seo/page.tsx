'use client'

import { useState } from 'react'
import { PlaySquare, Copy, Check, FileText, Tag, BarChart2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'

export default function YouTubeSeoPage() {
  const [activeTab, setActiveTab] = useState<'tag-generator' | 'video-rankings' | 'content-creator'>('tag-generator')
  
  // Shared state
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  
  // Content Creator state
  const [type, setType] = useState('description')
  const [niche, setNiche] = useState('General')
  const [scriptFormat, setScriptFormat] = useState('Standard (Host on camera)')
  
  // Video Rankings state
  const [videoUrl, setVideoUrl] = useState('')
  const [videoMeta, setVideoMeta] = useState<any>(null)
  const [isFetchingMeta, setIsFetchingMeta] = useState(false)
  
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
        body: JSON.stringify({ 
          type: activeTab === 'tag-generator' ? 'tags' : type, 
          topic, 
          keywords, 
          niche, 
          format: scriptFormat 
        })
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

  const handleAnalyzeVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl) {
      toast.error('Please enter a YouTube URL')
      return
    }

    setIsFetchingMeta(true)
    setVideoMeta(null)
    setContent('')

    try {
      const res = await fetch('/api/youtube/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      })
      const data = await res.json()

      if (res.ok) {
        setVideoMeta(data)
        // Also simulate fetching rankings using the title
        setTopic(data.title)
        
        // Auto-generate estimated rankings tags
        setIsGenerating(true)
        const tagRes = await fetch('/api/generate/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'rankings', topic: data.title, keywords: '' })
        })
        const tagData = await tagRes.json()
        if (tagRes.ok && tagData.result) {
          setContent(tagData.result)
        }
        setIsGenerating(false)
        
        toast.success('Analysis complete')
      } else {
        toast.error(data.error || 'Failed to analyze video')
      }
    } catch (error) {
      toast.error('An error occurred during analysis')
    } finally {
      setIsFetchingMeta(false)
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
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate highly optimized video tags, descriptions, and analyze rankings.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => { setActiveTab('tag-generator'); setContent(''); setTopic('') }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tag-generator'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          Tag Generator
        </button>
        <button
          onClick={() => { setActiveTab('video-rankings'); setContent(''); setVideoUrl(''); setVideoMeta(null) }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'video-rankings'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Video Rankings
        </button>
        <button
          onClick={() => { setActiveTab('content-creator'); setContent(''); setTopic('') }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'content-creator'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Content Creator
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit">
          {activeTab === 'tag-generator' && (
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
                  placeholder="e.g. How to make money online"
                  className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Tag className="w-5 h-5" />
                )}
                {isGenerating ? 'Generating Tags...' : 'Generate Tags'}
              </button>
            </form>
          )}

          {activeTab === 'video-rankings' && (
            <form onSubmit={handleAnalyzeVideo} className="space-y-6">
              <div>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  YouTube Video URL
                </label>
                <input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isFetchingMeta || isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {isFetchingMeta || isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <BarChart2 className="w-5 h-5" />
                )}
                {isFetchingMeta || isGenerating ? 'Analyzing Video...' : 'Analyze Rankings'}
              </button>
            </form>
          )}

          {activeTab === 'content-creator' && (
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
                <label className={`
                  flex items-center px-4 py-3 border rounded-lg cursor-pointer transition-colors
                  ${type === 'title' 
                    ? 'bg-red-50 border-red-600 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="title" 
                    checked={type === 'title'}
                    onChange={() => setType('title')}
                    className="sr-only" 
                  />
                  <div>
                    <p className="font-semibold text-sm">Optimized Titles</p>
                    <p className="text-xs mt-0.5 opacity-80">5 high-CTR title variations.</p>
                  </div>
                </label>

                <label className={`
                  flex items-center px-4 py-3 border rounded-lg cursor-pointer transition-colors
                  ${type === 'tags' 
                    ? 'bg-red-50 border-red-600 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="tags" 
                    checked={type === 'tags'}
                    onChange={() => setType('tags')}
                    className="sr-only" 
                  />
                  <div>
                    <p className="font-semibold text-sm">SEO Tags / Keywords</p>
                    <p className="text-xs mt-0.5 opacity-80">Top 20-30 ranking tags for your video.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label htmlFor="niche" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Video Niche
                </label>
                <select
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                >
                  <option value="General">General / Other</option>
                  <option value="Tech & Gadgets">Tech & Gadgets</option>
                  <option value="Finance & Business">Finance & Business</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Educational">Educational</option>
                  <option value="Vlogging & Lifestyle">Vlogging & Lifestyle</option>
                  <option value="Entertainment">Entertainment</option>
                </select>
              </div>

              {type === 'script' && (
                <div>
                  <label htmlFor="format" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Script Format
                  </label>
                  <select
                    id="format"
                    value={scriptFormat}
                    onChange={(e) => setScriptFormat(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  >
                    <option value="Standard (Host on camera)">Standard (Host on camera)</option>
                    <option value="Dialogue-based (Multiple actors)">Dialogue-based (Multiple actors)</option>
                    <option value="Narrator-based (Faceless / Voiceover)">Narrator-based (Faceless / Voiceover)</option>
                    <option value="Documentary Style">Documentary Style</option>
                    <option value="Tutorial / Screen Recording">Tutorial / Screen Recording</option>
                  </select>
                </div>
              )}
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
          )}
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col h-[700px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              {activeTab === 'tag-generator' ? 'Generated Tags' : activeTab === 'video-rankings' ? 'Rank Analysis' : 'Output'}
            </h3>
          </div>
          
          <div className="flex-1 p-0 overflow-y-auto bg-white dark:bg-[#1E293B] relative">
            {!content && !isGenerating && !isFetchingMeta ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4 p-6 min-h-[400px]">
                {activeTab === 'tag-generator' ? (
                  <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                ) : activeTab === 'video-rankings' ? (
                  <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                ) : (
                  <PlaySquare className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                )}
                <p>Fill out the form on the left to {activeTab === 'video-rankings' ? 'analyze the video' : 'generate content'}.</p>
              </div>
            ) : (isGenerating || isFetchingMeta) ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6 min-h-[400px]">
                <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
                  {isFetchingMeta ? 'Fetching Video Metadata...' : 'Analyzing YouTube algorithm...'}
                </p>
              </div>
            ) : (
              <div className="h-full w-full p-6 max-w-none">
                {activeTab === 'video-rankings' && videoMeta && (
                  <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-col sm:flex-row">
                      {videoMeta.thumbnail && (
                        <div className="relative w-full sm:w-64 h-36 shrink-0 bg-slate-200 dark:bg-slate-700">
                          <Image src={videoMeta.thumbnail} alt={videoMeta.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col justify-between w-full">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Video Title</p>
                          <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2">{videoMeta.title}</h4>
                        </div>
                        <div className="flex items-end justify-between mt-4">
                          <div className="flex gap-6">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Channel</p>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{videoMeta.channel}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Upload Date</p>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{videoMeta.uploadDate}</p>
                            </div>
                            {videoMeta.category && videoMeta.category !== 'Unknown Category' && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Category</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{videoMeta.category}</p>
                              </div>
                            )}
                          </div>
                          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md text-xs font-medium transition-colors">
                            <PlaySquare className="w-3.5 h-3.5 text-red-500" />
                            View on YouTube
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-50" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'tag-generator' || (activeTab === 'video-rankings' && content)) ? (
                  <div>
                    {activeTab === 'video-rankings' && (
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Estimated Ranking Keywords</h4>
                    )}
                    <div className="flex flex-wrap gap-2.5">
                      {activeTab === 'video-rankings' ? (() => {
                        try {
                          const rankings = JSON.parse(content);
                          if (Array.isArray(rankings)) {
                            return rankings.map((item: any, i: number) => (
                              <div key={i} className="flex items-center overflow-hidden border border-slate-200 dark:border-slate-700 rounded-full shadow-sm bg-slate-100 dark:bg-slate-800 transition-colors">
                                <div className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs font-bold border-r border-slate-200 dark:border-slate-700">
                                  #{item.rank}
                                </div>
                                <div className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {item.tag}
                                </div>
                              </div>
                            ))
                          }
                          throw new Error('Not an array');
                        } catch (e) {
                          // Fallback if AI fails to return JSON
                          return content.split(',').map((tag, i) => (
                            <div key={i} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                              {tag.trim()}
                            </div>
                          ))
                        }
                      })() : (
                        content.split(',').map((tag, i) => (
                          <div key={i} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                            {tag.trim()}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-[#0F172A] rounded-b-xl shrink-0">
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
