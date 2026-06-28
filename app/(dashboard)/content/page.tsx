'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Copy, RefreshCw, Save, History, Check, FileText, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateContentAction, saveGeneration, getRecentGenerations, deleteGeneration } from './actions'
import { useRouter } from 'next/navigation'

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
  
  const [history, setHistory] = useState<any[]>([])
  
  const [msgIndex, setMsgIndex] = useState(0)
  
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
    fetchHistory()
  }, [])

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
        i += 3 // Reveal 3 chars at a time for smooth streaming
        if (i > content.length) {
          setDisplayedContent(content)
          setIsStreaming(false)
          clearInterval(interval)
        }
      }, 10)
      
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

    const result = await generateContentAction(topic, type, tone, length)
    
    setIsGenerating(false)
    
    if (result.error) {
      toast.error(result.error)
    } else if (result.content) {
      setContent(result.content)
      setIsStreaming(true)
      toast.success('Content generated successfully')
      
      const wordCount = result.content.trim().split(/\s+/).length
      console.log('[SAVE TRACE] Calling saveGeneration...', { topic, type, tone, wordCount })
      
      const saveRes = await saveGeneration({
        topic,
        content_type: type,
        tone,
        generated_content: result.content,
        word_count: wordCount
      })
      
      console.log('[SAVE TRACE] saveGeneration response:', saveRes)
      
      await fetchHistory()
      router.refresh() // Force Next.js to re-render the Server Components and clear cache
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
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}>
                    <input 
                      type="radio" 
                      name="length" 
                      value={l} 
                      checked={length === l}
                      onChange={() => setLength(l)}
                      className="sr-only" 
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || isStreaming}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
          </form>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2 flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Generated Output
            </h3>
            <div className="flex gap-2">
              {displayedContent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {wordCount} words
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-[#1E293B]">
            {!content && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p>Fill out the form on the left to generate content.</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                {/* 3D Rotating Cube */}
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
                
                {/* Pulsing dots */}
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" 
                    style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" 
                    style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" 
                    style={{ animationDelay: '300ms' }} />
                </div>

                {/* Rotating text messages - cycles every 2 seconds */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 animate-pulse">
                    {messages[msgIndex]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    This usually takes a few seconds
                  </p>
                </div>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
                {displayedContent}
                {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" />}
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-[#0F172A] rounded-b-xl">
            <button 
              disabled={!displayedContent || isStreaming}
              onClick={() => handleGenerate(new Event('submit') as any)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
            <button 
              disabled={!displayedContent || isStreaming}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button 
              disabled={!displayedContent || isStreaming}
              onClick={handleCopy}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-slate-500" />
          Recent Generations
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
                  className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.content_type}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(item.created_at)}</span>
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
