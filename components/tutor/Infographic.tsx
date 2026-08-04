'use client'

import { Lightbulb, Wrench, FileText, Settings, Type, List, CheckCircle2, Star, Zap, BarChart, Brain, Heart, Layers } from 'lucide-react'

interface InfographicSection {
  title: string
  icon_concept: string
  tags: string[]
  description: string
}

interface InfographicData {
  main_title: string
  subtitle: string
  sections: InfographicSection[]
}

const getIcon = (concept: string) => {
  const c = concept.toLowerCase()
  if (c.includes('text') || c.includes('word') || c.includes('write')) return <Type className="w-8 h-8" />
  if (c.includes('tool') || c.includes('clean') || c.includes('fix')) return <Wrench className="w-8 h-8" />
  if (c.includes('format') || c.includes('setting') || c.includes('gear')) return <Settings className="w-8 h-8" />
  if (c.includes('list') || c.includes('step')) return <List className="w-8 h-8" />
  if (c.includes('star') || c.includes('best')) return <Star className="w-8 h-8" />
  if (c.includes('fast') || c.includes('zap') || c.includes('power')) return <Zap className="w-8 h-8" />
  if (c.includes('chart') || c.includes('data')) return <BarChart className="w-8 h-8" />
  if (c.includes('brain') || c.includes('think') || c.includes('smart')) return <Brain className="w-8 h-8" />
  if (c.includes('heart') || c.includes('love') || c.includes('care')) return <Heart className="w-8 h-8" />
  if (c.includes('layer') || c.includes('stack')) return <Layers className="w-8 h-8" />
  return <Lightbulb className="w-8 h-8" />
}

export function Infographic({ data }: { data: InfographicData | any }) {
  if (!data) return null

  // Handle fallback if AI returns an array (old format) instead of object
  const isArray = Array.isArray(data)
  const sections = isArray ? data : data.sections || []
  const mainTitle = isArray ? "Your Infographic" : data.main_title || "Your Infographic"
  const subtitle = isArray ? "A visual summary" : data.subtitle || "A visual summary"

  const tagColors = [
    'bg-emerald-400 text-emerald-950',
    'bg-blue-400 text-blue-950',
    'bg-purple-400 text-purple-950',
    'bg-rose-400 text-rose-950',
    'bg-amber-400 text-amber-950',
  ]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-[#7ba884] font-sans">
      
      {/* Header Area */}
      <div className="p-8 md:p-12 text-center text-[#1a3821]">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: '"Montserrat", sans-serif' }}>
          {mainTitle}
        </h1>
        <p className="text-lg md:text-xl font-bold opacity-80">
          {subtitle}
        </p>
      </div>

      {/* Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 p-1 bg-[#5c8564]">
        {sections.map((section: any, idx: number) => {
          return (
            <div key={idx} className="bg-[#8bb593] p-8 flex flex-col items-center text-center">
              
              <div className="text-[#1a3821] mb-4">
                {getIcon(section.icon_concept || 'lightbulb')}
              </div>
              
              <h3 className="text-xl font-bold text-[#1a3821] mb-2" style={{ fontFamily: '"Montserrat", sans-serif' }}>
                {section.title}
              </h3>
              
              <p className="text-sm text-[#2a4d33] mb-8 min-h-[40px]">
                {section.description || section.key_point || ''}
              </p>

              {/* Tags Area */}
              <div className="flex flex-col gap-3 w-full max-w-[200px] mx-auto mt-auto">
                {(section.tags || []).map((tag: string, tagIdx: number) => {
                  const colorClass = tagColors[(idx + tagIdx) % tagColors.length]
                  return (
                    <div 
                      key={tagIdx} 
                      className={`relative flex items-center justify-center py-2 px-4 rounded-r-full rounded-l-md font-bold text-sm tracking-wide shadow-md ${colorClass} hover:-translate-y-1 transition-transform`}
                    >
                      {/* Tag Hole */}
                      <div className="absolute left-2 w-2.5 h-2.5 rounded-full bg-[#8bb593] shadow-inner opacity-80" />
                      
                      {/* String effect */}
                      <svg className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-800/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M 24 12 Q 12 12 0 4" />
                      </svg>
                      
                      <span className="ml-3 truncate uppercase">{tag}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
