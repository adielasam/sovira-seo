'use client'

import React, { useRef, useState } from 'react'
import { Plus, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SlideTheme } from '@/lib/slides/templates'
import { BUILT_IN_TEMPLATES } from '@/lib/slides/templates'

interface TemplateGalleryProps {
  selectedTheme: SlideTheme
  onSelectTheme: (theme: SlideTheme) => void
  customThemes: SlideTheme[]
  onAddCustomTheme: (theme: SlideTheme) => void
}

export function TemplateGallery({ selectedTheme, onSelectTheme, customThemes, onAddCustomTheme }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<'recommended' | 'my-templates'>('recommended')
  const [isExtracting, setIsExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsExtracting(true)
    try {
      const { parseTemplateFromPptx } = await import('@/lib/slides/parseTemplate')
      const extractedTheme = await parseTemplateFromPptx(file)

      onAddCustomTheme(extractedTheme)
      onSelectTheme(extractedTheme)
      setActiveTab('my-templates')
      toast.success('Template extracted successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to extract template from PPTX file.')
    } finally {
      setIsExtracting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const renderTemplateCard = (theme: SlideTheme) => {
    const isSelected = selectedTheme.id === theme.id

    return (
      <div
        key={theme.id}
        onClick={() => onSelectTheme(theme)}
        className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 ${
          isSelected ? 'ring-2 ring-[#F97316] ring-offset-2 scale-[1.02] shadow-lg' : 'shadow hover:scale-[1.02] hover:shadow-md'
        }`}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{ background: theme.preview }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white text-sm font-semibold truncate">{theme.name}</h3>
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2 bg-[#F97316] text-white p-1 rounded-full shadow">
            <Check size={14} strokeWidth={3} />
          </div>
        )}

        {!isSelected && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm">
              Apply Template
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'recommended'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Recommended Templates
            {activeTab === 'recommended' && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#F97316]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'my-templates'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            My Templates
            {customThemes.length > 0 && (
              <span className="ml-1.5 bg-[#F97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {customThemes.length}
              </span>
            )}
            {activeTab === 'my-templates' && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#F97316]" />
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-3 mb-2">
          <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md px-2 py-1 outline-none">
            <option>Featured</option>
            <option>All</option>
          </select>
          <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md px-2 py-1 outline-none">
            <option>All Colors</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {activeTab === 'recommended' ? (
          <>
            {/* Upload Card */}
            <div
              onClick={() => !isExtracting && fileInputRef.current?.click()}
              className="relative aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#F97316] dark:hover:border-[#F97316] hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer flex flex-col items-center justify-center transition-all group"
            >
              {isExtracting ? (
                <div className="flex flex-col items-center text-[#F97316]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs font-medium">Extracting...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                    <Plus className="w-5 h-5 text-slate-500 group-hover:text-[#F97316]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#F97316]">
                    Upload Template
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">.pptx files only</span>
                </>
              )}
              <input
                type="file"
                accept=".pptx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isExtracting}
              />
            </div>

            {/* Built-in Templates */}
            {BUILT_IN_TEMPLATES.map(renderTemplateCard)}
          </>
        ) : (
          <>
            {customThemes.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No Custom Templates</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload a .pptx file in the Recommended tab to create your first custom template.
                </p>
                <button
                  onClick={() => setActiveTab('recommended')}
                  className="mt-4 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Browse Recommended
                </button>
              </div>
            ) : (
              customThemes.map(renderTemplateCard)
            )}
          </>
        )}
      </div>
    </div>
  )
}
