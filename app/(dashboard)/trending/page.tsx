'use client'

import { useState, useEffect } from 'react'
import { Flame, ArrowRight, ExternalLink, RefreshCw, Edit3, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Article {
  title: string;
  url: string;
  source: string;
  time: string;
  snippet: string;
}

interface TrendingStory {
  id: string;
  title: string;
  entityNames: string[];
  articles: Article[];
  image: string;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' }
]

const NICHES = [
  'All Niches',
  'Finance',
  'Business',
  'Education',
  'Politics',
  'Tech News',
  'Football',
  'Cooking',
  'Health & Fitness',
  'Entertainment',
  'Real Estate'
]

export default function TrendingTopicsPage() {
  const [trends, setTrends] = useState<TrendingStory[]>([])
  const [loading, setLoading] = useState(true)
  const [geo, setGeo] = useState('US')
  const [niche, setNiche] = useState('All Niches')

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trending?geo=${geo}&niche=${encodeURIComponent(niche)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load trends')
      setTrends(data.trending || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [geo, niche])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            Viral Trending Topics
          </h1>
          <p className="text-slate-500 mt-2">Real-time search trends and news across the internet.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none text-slate-700 dark:text-slate-300"
            >
              {NICHES.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none text-slate-700 dark:text-slate-300"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchTrends}
            className="p-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl h-64 w-full"></div>
          ))}
        </div>
      ) : trends.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500">No trending topics found for this region right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {trends.map((story) => (
            <div key={story.id} className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">
                    {story.title}
                  </h2>
                  {story.image && (
                    <img src={story.image} alt={story.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-slate-100" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {story.entityNames.map((name, idx) => (
                    <span key={idx} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full border border-orange-200 dark:border-orange-800/30">
                      {name}
                    </span>
                  ))}
                </div>

                <div className="space-y-4 mb-6">
                  {story.articles.slice(0, 2).map((article, idx) => (
                    <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline line-clamp-1">
                        {article.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>{article.source}</span>
                        <span>•</span>
                        <span>{article.time}</span>
                      </p>
                    </a>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href={`/content?topic=${encodeURIComponent(story.title)}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-blue-500/20"
                >
                  <Edit3 className="w-4 h-4" />
                  Write AI Article
                </Link>
                <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent(story.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Search <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
