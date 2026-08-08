'use client'

import { useState } from 'react'
import { Sparkles, ArrowLeft, Loader2, Paperclip, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { generateSlideDeck } from './actions'
import { SlideDeckViewer } from '@/components/slides/SlideDeckViewer'
import type { DeckJSON } from './actions'

import { TemplateGallery } from '@/components/slides/TemplateGallery'
import { BUILT_IN_TEMPLATES, DEFAULT_THEME } from '@/lib/slides/templates'
import type { SlideTheme } from '@/lib/slides/templates'

export default function SlidesAgentPage() {
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState('10')
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('Professional')
  const [selectedTheme, setSelectedTheme] = useState<SlideTheme>(DEFAULT_THEME)
  const [customThemes, setCustomThemes] = useState<SlideTheme[]>([])
  const [generatedDeck, setGeneratedDeck] = useState<DeckJSON | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a presentation topic first.')
      return
    }
    setIsGenerating(true)

    try {
      const count = parseInt(slideCount) || 10
      const theme = activeTab.toLowerCase()

      const result = await generateSlideDeck(prompt, count, theme)

      if (result.error) {
        toast.error(result.error)
        setIsGenerating(false)
        return
      }

      if (result.deck) {
        setGeneratedDeck(result.deck)
        toast.success(`Generated ${result.deck.slides.length} slides!`)
      }
    } catch (err) {
      toast.error('Failed to generate slides. Please try again.')
    }

    setIsGenerating(false)
  }

  return (
    <div className="flex flex-col max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard" className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Slides Agent</h1>
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-3 py-1.5 rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered
        </div>
      </div>

      {/* Style Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200 dark:border-slate-700/50">
          {['Professional', 'Creative', 'Academic'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-[#F97316] ring-1 ring-slate-200 dark:ring-slate-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[#F97316]/30 dark:border-[#F97316]/50 overflow-hidden ring-4 ring-[#F97316]/5 transition-all focus-within:ring-[#F97316]/10">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your presentation topic in detail. E.g. 'Patient Safety Protocols in Nigerian Hospitals — covering key challenges, international standards, and implementation strategies'..."
          className="w-full min-h-[120px] p-6 text-lg bg-transparent border-none outline-none resize-none placeholder:text-slate-400 text-slate-900 dark:text-white"
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#F97316]" />}
              {isGenerating ? 'Generating...' : 'Generate Slides'}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <select
              value={slideCount}
              onChange={(e) => setSlideCount(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer appearance-none px-2 pr-6 relative"
            >
              <option value="5">5 Slides</option>
              <option value="8">8 Slides</option>
              <option value="10">10 Slides</option>
              <option value="12">12 Slides</option>
              <option value="15">15 Slides</option>
              <option value="20">20 Slides</option>
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <select className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer appearance-none px-2 pr-6">
              <option>16:9</option>
              <option>4:3</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="mt-12">
        <TemplateGallery
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
          customThemes={customThemes}
          onAddCustomTheme={(theme) => setCustomThemes(prev => [...prev, theme])}
        />
      </div>

      {/* Slide Deck Viewer/Editor Modal */}
      {generatedDeck && (
        <SlideDeckViewer
          initialDeck={generatedDeck}
          onClose={() => setGeneratedDeck(null)}
          theme={selectedTheme}
        />
      )}
    </div>
  )
}
