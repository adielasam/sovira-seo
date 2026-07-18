'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Copy, RefreshCw, Save, History, Check, FileText, Trash2, Edit2, Eye, Send, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateContentAction, saveGeneration, getRecentGenerations, deleteGeneration, updateGeneration, publishToWordPressAction } from './actions'
import { getCmsIntegration } from '../integrations/actions'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + " years ago"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + " months ago"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + " days ago"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + " hours ago"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + " minutes ago"
  return "Just now"
}

export default function ContentPage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('Blog Post')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('Medium')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [displayedContent, setDisplayedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [history, setHistory] = useState<any[]>([])
  const [cmsProvider, setCmsProvider] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  
  const [trending, setTrending] = useState<any[]>([])
  const [loadingTrending, setLoadingTrending] = useState(false)

  const messages = [
    "Crafting your content...",
    "Analyzing your topic...",
    "Optimizing for SEO...",
    "Adding the finishing touches...",
    "Almost ready..."
  ]

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isGenerating])

  useEffect(() => {
    // Auto-fill topic from URL params if present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const topicParam = urlParams.get('topic')
      if (topicParam) {
        setTopic(decodeURIComponent(topicParam))
      }
    }
    fetchHistory()
    fetchCmsIntegration()
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    setLoadingTrending(true)
    try {
      const res = await fetch('/api/trending?geo=US')
      const data = await res.json()
      if (res.ok && data.trending) {
        setTrending(data.trending.slice(0, 5)) // Get top 5
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTrending(false)
    }
  }

  const fetchCmsIntegration = async () => {
    const { data } = await getCmsIntegration()
    if (data && data.cms_provider) {
      setCmsProvider(data.cms_provider)
    }
  }

  const fetchHistory = async () => {
    const { data } = await getRecentGenerations()
    if (data) setHistory(data)
  }

  // Simulation of streaming
  useEffect(() => {
    if (isStreaming && content) {
      let i = 0;
      setDisplayedContent('')
      
      const interval = setInterval(() => {
        setDisplayedContent(content.substring(0, i))
        i += 3 
        if (i > content.length) {
          setDisplayedContent(content)
          setIsStreaming(false)
          clearInterval(interval)
        }
      }, 5) 
      
      return () => clearInterval(interval)
    }
  }, [isStreaming, content])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic) {
      toast.error('Please enter a topic or keyword')
      return
    }

    setIsGenerating(true)
    setContent('')
    setDisplayedContent('')
    setIsStreaming(false)
    setActiveId(null)
    setViewMode('preview')

    const result = await generateContentAction(topic, type, tone, length)
    
    setIsGenerating(false)
    
    if (result.error) {
      if (result.error === 'LIMIT_REACHED') {
        window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: result.message } }))
        setIsStreaming(false)
        return
      }
      toast.error(result.error)
      setIsStreaming(false)
      return
    }
    
    if (result.content) {
      setContent(result.content)
      setIsStreaming(true)
      toast.success('Content generated successfully')
      
      const wordCount = result.content.trim().split(/\s+/).length
      const saveRes = await saveGeneration({
        topic,
        content_type: type,
        tone,
        generated_content: result.content,
        word_count: wordCount
      })
      
      if (saveRes.success && saveRes.id) {
        setActiveId(saveRes.id)
      }
      
      await fetchHistory()
      router.refresh()
    }
  }

  const handleSaveDraft = async () => {
    if (!activeId) {
      toast.error('No active draft to save.')
      return
    }
    setIsSaving(true)
    const { success, error } = await updateGeneration(activeId, displayedContent)
    setIsSaving(false)
    
    if (success) {
      toast.success('Draft saved successfully!')
      fetchHistory()
    } else {
      toast.error(error || 'Failed to save draft')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedContent)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { success, error } = await deleteGeneration(id)
    if (success) {
      toast.success('Deleted generation')
      if (activeId === id) {
        setActiveId(null)
        setDisplayedContent('')
        setContent('')
      }
      fetchHistory()
    } else {
      toast.error(error || 'Failed to delete')
    }
  }

  const handleHistoryClick = (item: any) => {
    setTopic(item.topic)
    setType(item.content_type)
    setTone(item.tone || 'Professional')
    setContent(item.generated_content)
    setDisplayedContent(item.generated_content)
    setIsStreaming(false)
    setActiveId(item.id)
    setViewMode('preview')
  }

  const handlePublish = async () => {
    if (!activeId || !cmsProvider || !displayedContent) return
    setIsPublishing(true)
    
    // Extract title (first H1 or first line)
    const titleMatch = displayedContent.match(/^#\s+(.*)/m)
    const postTitle = titleMatch ? titleMatch[1] : `AI Generated Post - ${new Date().toLocaleDateString()}`
    
    const result = await publishToWordPressAction(postTitle, displayedContent)
    
    setIsPublishing(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Successfully published draft to WordPress!`)
    }
  }

  const wordCount = displayedContent.trim() ? displayedContent.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content AI Generator</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Create SEO-optimized content in seconds with Sovira AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Topic or Keyword
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Best SEO practices 2026"
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Content Type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option>Blog Post</option>
                <option>Meta Description</option>
                <option>Title Tags</option>
                <option>Social Media Post</option>
                <option>Product Description</option>
                <option>Email Subject</option>
                <option>Viral Video Script</option>
                <option>YouTube Title</option>
              </select>
            </div>

            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tone of Voice
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option>Professional</option>
                <option>Casual</option>
                <option>Persuasive</option>
                <option>Friendly</option>
                <option>Authoritative</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Target Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Short', 'Medium', 'Long'].map((l) => (
                  <label key={l} className={`
                    flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer text-sm font-medium transition-colors
                    ${length === l 
                      ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}>
                    <input 
                      type="radio" 
                      name="length" 
                      value={l} 
                      checked={length === l}
                      onChange={(e) => setLength(e.target.value)}
                      className="sr-only" 
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </form>

          {/* Trending Topics Section */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Trending Keywords (US)
              </h3>
              <button onClick={fetchTrending} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                {loadingTrending ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Refresh'}
              </button>
            </div>
            
            {loadingTrending && trending.length === 0 ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>)}
              </div>
            ) : trending.length === 0 ? (
              <p className="text-xs text-slate-500">No trends found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trending.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopic(t.title);
                      setType(idx % 2 === 0 ? 'Viral Video Script' : 'YouTube Title'); // Alternating just for UX
                    }}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-3">
              Click a trending keyword to auto-fill your topic and generate viral content.
            </p>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col h-[700px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Content Drafting
            </h3>
            
            {displayedContent && (
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button 
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {wordCount} words
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-0 overflow-hidden bg-white dark:bg-[#1E293B] relative">
            {!content && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4 p-6">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p>Fill out the form on the left to generate content.</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
                <div className="relative w-16 h-16" style={{ perspective: '200px' }}>
                  <div className="absolute inset-0 animate-spin rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed, #06b6d4)',
                      animation: 'spin3d 1.5s ease-in-out infinite',
                      transformStyle: 'preserve-3d',
                      boxShadow: '0 0 30px rgba(37,99,235,0.5)'
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
                    {messages[msgIndex]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">This usually takes a few seconds</p>
                </div>
              </div>
            ) : (
              <div className="h-full w-full relative">
                {viewMode === 'edit' ? (
                  <textarea
                    value={displayedContent}
                    onChange={(e) => setDisplayedContent(e.target.value)}
                    className="w-full h-full p-6 bg-transparent text-slate-800 dark:text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                    placeholder="Start drafting your content here..."
                  />
                ) : (
                  <div className="h-full w-full p-6 overflow-y-auto prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {displayedContent + (isStreaming ? ' █' : '')}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50 dark:bg-[#0F172A] rounded-b-xl">
            <button 
              disabled={!activeId || isStreaming || !cmsProvider || isPublishing}
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPublishing ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {cmsProvider ? `Publish to ${cmsProvider === 'wordpress' ? 'WordPress' : 'Webflow'}` : 'Connect CMS to Publish'}
            </button>

            <div className="flex gap-2">
              <button 
                disabled={!displayedContent || isStreaming}
                onClick={() => handleGenerate(new Event('submit') as any)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
              <button 
                disabled={!displayedContent || isStreaming || !activeId || isSaving}
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
              <button 
                disabled={!displayedContent || isStreaming}
                onClick={handleCopy}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-slate-500" />
          Version History & Drafts
        </h2>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No generations yet. Create your first piece of content!
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((item) => (
                <li 
                  key={item.id} 
                  onClick={() => handleHistoryClick(item)}
                  className={`p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${activeId === item.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.content_type}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.updated_at ? `Last edited ${timeAgo(item.updated_at)}` : `Created ${timeAgo(item.created_at)}`}
                      </span>
                      {activeId === item.id && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Edit2 className="w-3 h-3" /> Active Draft
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.topic}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-opacity p-2"
                    title="Delete generation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
