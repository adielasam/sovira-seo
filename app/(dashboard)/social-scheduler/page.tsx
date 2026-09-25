'use client'

import { useState } from 'react'
import { Sparkles, Calendar, Twitter, Linkedin, Facebook, Loader2, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SocialSchedulerPage() {
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<{twitter?: string, linkedin?: string, facebook?: string} | null>(null)

  const [posts, setPosts] = useState({
    twitter: { text: '', scheduleDate: '', isScheduling: false, success: false },
    linkedin: { text: '', scheduleDate: '', isScheduling: false, success: false },
    facebook: { text: '', scheduleDate: '', isScheduling: false, success: false }
  })

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error('Please paste your blog content first')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to generate posts')
      
      setGeneratedPosts(data)
      setPosts({
        twitter: { ...posts.twitter, text: data.twitter, success: false },
        linkedin: { ...posts.linkedin, text: data.linkedin, success: false },
        facebook: { ...posts.facebook, text: data.facebook, success: false }
      })
      toast.success('Social posts generated!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSchedule = async (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const postData = posts[platform]
    if (!postData.text) {
      toast.error('Post content cannot be empty')
      return
    }

    let scheduleDateIso = undefined
    if (postData.scheduleDate) {
      const date = new Date(postData.scheduleDate)
      if (date <= new Date()) {
        toast.error('Schedule date must be in the future')
        return
      }
      scheduleDateIso = date.toISOString()
    }

    setPosts(prev => ({ ...prev, [platform]: { ...prev[platform], isScheduling: true } }))

    try {
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post: postData.text,
          platforms: [platform],
          scheduleDate: scheduleDateIso
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule post')
      
      setPosts(prev => ({ ...prev, [platform]: { ...prev[platform], success: true } }))
      toast.success(`Successfully scheduled on ${platform}!`)
    } catch (error: any) {
      toast.error(`Ayrshare API Error: ${error.message}`)
    } finally {
      setPosts(prev => ({ ...prev, [platform]: { ...prev[platform], isScheduling: false } }))
    }
  }

  const platformConfig = {
    twitter: { icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Twitter / X' },
    linkedin: { icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-600/10', label: 'LinkedIn' },
    facebook: { icon: Facebook, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Facebook' }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Social Scheduler</h1>
        <p className="text-sm text-slate-500 mt-1">Automatically generate and schedule social media posts from your blogs using Ayrshare.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          1. Paste your blog content or article
        </label>
        <textarea
          rows={6}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white mb-4"
          placeholder="Paste your blog content here to generate social posts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating Magic...' : 'Generate Social Posts'}
        </button>
      </div>

      {generatedPosts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['twitter', 'linkedin', 'facebook'] as const).map((platform) => {
            const config = platformConfig[platform]
            const Icon = config.icon
            const postState = posts[platform]

            return (
              <div key={platform} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{config.label}</h3>
                </div>
                
                <textarea
                  rows={8}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white mb-4 flex-grow"
                  value={postState.text}
                  onChange={(e) => setPosts(prev => ({ ...prev, [platform]: { ...prev[platform], text: e.target.value } }))}
                />

                <div className="space-y-3 mt-auto">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Schedule Date (Optional)</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                      value={postState.scheduleDate}
                      onChange={(e) => setPosts(prev => ({ ...prev, [platform]: { ...prev[platform], scheduleDate: e.target.value } }))}
                    />
                  </div>
                  
                  <button
                    onClick={() => handleSchedule(platform)}
                    disabled={postState.isScheduling || postState.success}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      postState.success 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50'
                    }`}
                  >
                    {postState.isScheduling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : postState.success ? (
                      'Scheduled!'
                    ) : (
                      <>
                        {postState.scheduleDate ? <Calendar className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {postState.scheduleDate ? 'Schedule Post' : 'Post Now'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
