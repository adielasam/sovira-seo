'use client'

import { useState } from 'react'
import { Sparkles, FileText, ChevronDown, Paperclip, ArrowUp, ArrowLeft, Loader2, Download, MonitorPlay } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import pptxgen from 'pptxgenjs'

const TEMPLATES = [
  { id: '1', title: 'Patient Safety Protocols', color: 'bg-blue-600' },
  { id: '2', title: 'Partnership Guide 2026', color: 'bg-slate-800' },
  { id: '3', title: 'Occupational Psychology', color: 'bg-teal-600' },
  { id: '4', title: 'Copywriting Essentials', color: 'bg-rose-100 text-rose-900' },
]

export default function SlidesAgentPage() {
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState('5-10 Slides')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState('Professional')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('1')
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([])
  const [dataSource, setDataSource] = useState('wikipedia')

  const updateSlide = (index: number, field: string, value: any) => {
    const newSlides = [...generatedSlides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setGeneratedSlides(newSlides);
  }

  const generateSlidesLocally = async (topic: string, count: number) => {
    let slides = [];
    
    if (dataSource === 'academic') {
      try {
        const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=5&fields=title,abstract,year,authors`)
        const data = await res.json()
        
        if (data.data && data.data.length > 0) {
          slides.push({
            title: `Literature Review: ${topic}`,
            subtitle: "Academic Research Summary",
            points: ["Compiled from peer-reviewed publications", "Sourced via Semantic Scholar"]
          })
          
          data.data.forEach((paper: any) => {
            if (slides.length >= count) return;
            
            // Extract the first few sentences of the abstract
            let abstractPoints = [];
            if (paper.abstract) {
              const sentences = paper.abstract.split('. ').filter((s: string) => s.length > 20);
              abstractPoints = sentences.slice(0, 3).map((s: string) => s + (s.endsWith('.') ? '' : '.'));
            } else {
              abstractPoints = ["No abstract available for this paper."];
            }
            
            const authorText = paper.authors && paper.authors.length > 0 
              ? ` (${paper.authors[0].name} et al., ${paper.year || 'N/A'})` 
              : ` (${paper.year || 'N/A'})`;

            slides.push({
              title: paper.title,
              subtitle: `Published${authorText}`,
              points: abstractPoints
            })
          })
        }
      } catch (e) {
        console.log('Semantic Scholar fetch failed', e)
      }
    } else {
      try {
        // Try to fetch real factual data from Wikipedia (Free open API)
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(topic)}&format=json&origin=*`)
        const data = await res.json()
        const pages = data.query?.pages
        if (pages) {
          const pageId = Object.keys(pages)[0]
          const extract = pages[pageId].extract
          if (extract && extract.length > 50) {
            slides.push({
              title: topic,
              subtitle: "An Overview",
              points: []
            })
            
            // Split into sentences for bullet points
            const sentences = extract.split('. ').filter((s: string) => s.length > 10)
            
            let currentPoints = []
            for (let i = 0; i < sentences.length; i++) {
              currentPoints.push(sentences[i] + (sentences[i].endsWith('.') ? '' : '.'))
              
              if (currentPoints.length >= 4 || i === sentences.length - 1) {
                slides.push({
                  title: `Key Facts about ${topic}`,
                  subtitle: "",
                  points: [...currentPoints]
                })
                currentPoints = []
                if (slides.length >= count) break;
              }
            }
          }
        }
      } catch (e) {
        console.log('Wikipedia fetch failed', e)
      }
    }

    // Ensure we have exactly `count` slides
    if (slides.length === 0) {
      slides.push({
        title: topic || "Presentation",
        subtitle: "Executive Summary",
        points: []
      })
    }

    let currentLength = slides.length;
    for (let i = currentLength; i < count; i++) {
       const sectionTitles = [
         "Introduction", "Key Analysis", "Implementation Strategy", "Market Trends", "Risk Factors", "Conclusion"
       ];
       const idx = (i - 1) % sectionTitles.length;
       slides.push({
         title: sectionTitles[idx],
         subtitle: `Section ${i + 1}`,
         points: [
           `Detailed point 1 regarding ${topic || 'the topic'}`,
           `Detailed point 2 regarding ${topic || 'the topic'}`,
           `Detailed point 3 regarding ${topic || 'the topic'}`
         ]
       })
    }

    
    return slides.slice(0, count)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a presentation topic first.')
      return
    }
    setIsGenerating(true)
    
    try {
      // Parse slide count from dropdown (e.g. "5-10 Slides" -> 10)
      const maxSlides = parseInt(slideCount.split('-')[1] || slideCount.split(' ')[0] || '10')
      
      // UX Delay for "thinking"
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newSlides = await generateSlidesLocally(prompt, maxSlides)
      
      setGeneratedSlides(newSlides)
      setIsGenerating(false)
      setShowPreview(true)
    } catch (err) {
      toast.error('Error generating slides.')
      setIsGenerating(false)
    }
  }

  const exportPPTX = () => {
    toast.loading('Generating PowerPoint file...', { id: 'pptx' })
    
    try {
      let pres = new pptxgen()
      pres.layout = 'LAYOUT_16x9'

      // Define Theme Colors based on Selected Template
      let bgColor = 'FFFFFF'
      let mainColor = '2563EB' // Blue for shapes
      let textColor = '1E293B' // Dark slate for body
      let subTextColor = '64748B'
      let headerTextColor = 'FFFFFF'

      if (selectedTemplate === '1') { // Blue Theme
        bgColor = 'FFFFFF'
        mainColor = '2563EB' 
        textColor = '1E293B' 
        subTextColor = '64748B'
        headerTextColor = 'FFFFFF'
      } else if (selectedTemplate === '2') { // Dark Theme
        bgColor = '0F172A' // slate-900
        mainColor = '38BDF8' // sky-400
        textColor = 'F8FAFC' // slate-50
        subTextColor = '94A3B8'
        headerTextColor = '0F172A' // Dark text on light blue header
      } else if (selectedTemplate === '3') { // Teal Theme
        bgColor = 'FFFFFF'
        mainColor = '0D9488' // teal-600
        textColor = '134E4A'
        subTextColor = '475569'
        headerTextColor = 'FFFFFF'
      } else if (selectedTemplate === '4') { // Rose Theme
        bgColor = 'FFF1F2' // rose-50
        mainColor = 'E11D48' // rose-600
        textColor = '881337' // rose-900
        subTextColor = '9F1239'
        headerTextColor = 'FFFFFF'
      }

      // Define Master Slides for Premium Layouts
      pres.defineSlideMaster({
        title: 'TITLE_SLIDE',
        background: { color: bgColor },
        objects: [
          // Massive colored banner at the top
          { rect: { x: 0, y: 0, w: '100%', h: '35%', fill: { color: mainColor } } },
          // Thin accent line at the bottom
          { rect: { x: 0, y: '95%', w: '100%', h: '5%', fill: { color: mainColor } } },
        ]
      })

      pres.defineSlideMaster({
        title: 'CONTENT_SLIDE',
        background: { color: bgColor },
        objects: [
          // Header bar
          { rect: { x: 0, y: 0, w: '100%', h: '16%', fill: { color: mainColor } } },
          // Thin footer accent
          { rect: { x: 0, y: '98%', w: '100%', h: '2%', fill: { color: mainColor } } },
          // Footer branding text
          { text: { text: 'Generated by Sovira AI Slides Agent', options: { x: 0.5, y: '93%', w: '50%', h: '5%', fontSize: 10, color: subTextColor, italic: true } } }
        ]
      })

      // Generate the Slides
      if (generatedSlides.length === 0) {
        let titleSlide = pres.addSlide({ masterName: 'TITLE_SLIDE' })
        titleSlide.addText(prompt || 'Generated Presentation', { x: 0.5, y: '45%', w: '90%', h: 1.5, fontSize: 48, bold: true, color: textColor, align: 'center' })
      } else {
        generatedSlides.forEach((slideData, idx) => {
          if (idx === 0) {
            let slide = pres.addSlide({ masterName: 'TITLE_SLIDE' })
            slide.addText(slideData.title, { x: 0.5, y: '45%', w: '90%', h: 1.5, fontSize: 52, bold: true, color: textColor, align: 'center' })
            if (slideData.subtitle) {
              slide.addText(slideData.subtitle, { x: 0.5, y: '65%', w: '90%', h: 1, fontSize: 24, color: subTextColor, align: 'center' })
            }
          } else {
            let slide = pres.addSlide({ masterName: 'CONTENT_SLIDE' })
            // Add Header Text explicitly so it layers correctly over the shape
            slide.addText(slideData.title, { x: 0.5, y: '3%', w: '90%', h: '10%', fontSize: 32, bold: true, color: headerTextColor, align: 'left' })
            
            if (slideData.points && slideData.points.length > 0) {
              // Add larger spacing between bullet points for readability
              const pointsStr = slideData.points.map((p: string) => `• ${p}`).join('\n\n')
              slide.addText(pointsStr, { x: 0.5, y: '22%', w: '90%', h: '70%', fontSize: 22, color: textColor, align: 'left', valign: 'top' })
            }
          }
        })
      }

      pres.writeFile({ fileName: 'Sovira_Presentation.pptx' }).then(() => {
        toast.success('Downloaded successfully!', { id: 'pptx' })
        setShowPreview(false)
      })
    } catch (e) {
      toast.error('Failed to generate PPTX', { id: 'pptx' })
    }
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
          Go Pro from just $9/mo
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200 dark:border-slate-700/50">
          {['Professional', 'Creative', 'Beautify'].map(tab => (
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
          placeholder="Enter your presentation topic, idea, or requirements..."
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
              Generate Agent
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <select 
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer appearance-none px-2 pr-6 relative"
            >
              <option value="wikipedia">General Knowledge (Wiki)</option>
              <option value="academic">Academic Research</option>
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <select 
              value={slideCount}
              onChange={(e) => setSlideCount(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer appearance-none px-2 pr-6 relative"
            >
              <option>5-10 Slides</option>
              <option>10-15 Slides</option>
              <option>15-20 Slides</option>
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

            <select className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer appearance-none px-2 pr-6">
              <option>16:9</option>
              <option>4:3</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-400">25 Credits</span>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center hover:bg-[#EA580C] transition-colors disabled:opacity-50"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="mt-12">
        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
          <button className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b-2 border-[#F97316]">
            Recommend Templates
          </button>
          <button className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white pb-3">
            My Templates
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="aspect-[16/9] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="text-2xl mb-2">+</span>
            <span className="text-xs font-semibold">Click add your template</span>
          </div>
          
          {TEMPLATES.map((t) => (
            <div 
              key={t.id} 
              onClick={() => setSelectedTemplate(t.id)}
              className={`relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-[#F97316] transition-all ${t.color}`}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-sm font-bold text-white shadow-sm leading-tight">{t.title}</h3>
              </div>
              {selectedTemplate === t.id && (
                <div className="absolute top-2 right-2 bg-[#F97316] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Selected
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal (Mocked) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-[#F97316]" />
                Slides Preview
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="p-8 bg-slate-100 dark:bg-slate-950 flex-1 overflow-y-auto flex flex-col items-center gap-6">
              {generatedSlides.map((slide, index) => (
                <div key={index} className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-lg shadow-md flex flex-col p-8 border-t-4 border-[#F97316]">
                  <div className="text-sm font-bold text-slate-400 mb-4">Slide {index + 1}</div>
                  <input 
                    value={slide.title}
                    onChange={(e) => updateSlide(index, 'title', e.target.value)}
                    placeholder="Slide Title"
                    className="w-full text-2xl font-extrabold text-slate-800 dark:text-white mb-2 bg-transparent outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 transition-colors"
                  />
                  <input 
                    value={slide.subtitle}
                    onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
                    placeholder="Subtitle (optional)"
                    className="w-full text-sm text-slate-500 mb-6 bg-transparent outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 transition-colors"
                  />
                  
                  {index > 0 && (
                    <textarea 
                      value={(slide.points || []).join('\n')}
                      onChange={(e) => updateSlide(index, 'points', e.target.value.split('\n'))}
                      placeholder="Bullet points (one per line)"
                      className="w-full text-base text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 outline-none border border-slate-200 dark:border-slate-700 rounded-lg p-4 min-h-[120px] focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                Close Preview
              </button>
              <button onClick={exportPPTX} className="flex items-center gap-2 px-6 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold rounded-lg shadow-md transition-colors">
                <Download className="w-4 h-4" />
                Export to PowerPoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
