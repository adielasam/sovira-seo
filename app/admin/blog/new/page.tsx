'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, LayoutTemplate, Image as ImageIcon, Sparkles } from 'lucide-react'
import { saveBlogPost } from '../actions'
import { toast } from 'react-hot-toast'

export default function NewBlogPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiTopic, setAiTopic] = useState('')

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [slug, setSlug] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')

  const handleGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      
      setTitle(data.title || '');
      setContent(data.content || '');
      setSlug(data.slug || '');
      setMetaTitle(data.meta_title || '');
      setMetaDescription(data.meta_description || '');
      toast.success('Blog post generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await saveBlogPost(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Success will redirect automatically via the server action
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/blog" className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Write New Post</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Create an SEO-optimized article.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">

            {/* AI Generator Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/50 p-6 space-y-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                <Sparkles className="w-5 h-5" />
                <h2>AI Content Writer (Google & Yoast Standards)</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter a topic or keyword to instantly generate an SEO-optimized blog post, complete with meta tags and URL slug.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. The Ultimate Guide to Local SEO"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiTopic.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {isGenerating ? 'Generating...' : 'Generate Post'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">Blog Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10 Best SEO Strategies for 2026"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="content" className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Content (Markdown Supported) *</span>
                  <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Markdown Guide</a>
                </label>
                <textarea
                  id="content"
                  name="content"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  placeholder="Write your amazing content here... Use # for headings, ** for bold, and []() for links."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-slate-500" />
                SEO Settings (Yoast Style)
              </h3>
              
              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium text-slate-700 dark:text-slate-300">URL Slug</label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="meta_title" className="text-sm font-medium text-slate-700 dark:text-slate-300">Meta Title</label>
                <input
                  type="text"
                  id="meta_title"
                  name="meta_title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO optimized title (60 chars)"
                  maxLength={65}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="meta_description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Meta Description</label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="Compelling description for search results (150-160 chars)"
                  maxLength={160}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                Media
              </h3>
              
              <div className="space-y-2">
                <label htmlFor="image_url" className="text-sm font-medium text-slate-700 dark:text-slate-300">Cover Image URL</label>
                <input
                  type="url"
                  id="image_url"
                  name="image_url"
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <label htmlFor="published" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Publish immediately?
                </label>
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
