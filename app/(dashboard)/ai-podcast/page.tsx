'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, RefreshCw, AudioLines, Settings2, PlaySquare, Play, Square, Pause, Loader2, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const EMOTIONS = [
  'Professional',
  'Energetic',
  'Humorous',
  'Serious',
  'Inspirational',
  'Calm',
  'Dramatic'
]

const humanizeVoiceName = (name: string) => {
  let cleanName = name
    .replace(/Microsoft |Google |Apple /gi, '')
    .replace(/ - English \([^)]+\)/gi, '')
    .replace(/ \([^)]+\)/g, '')
    .replace(/Desktop|Online \(Natural\)/gi, '')
    .trim();
  
  if (cleanName.includes('Zira')) return 'Zira (Warm Female)'
  if (cleanName.includes('David')) return 'David (Professional Male)'
  if (cleanName.includes('Mark')) return 'Mark (Friendly Male)'
  if (cleanName.includes('Hazel')) return 'Hazel (British Female)'
  if (cleanName.includes('US English') && name.includes('Female')) return 'Sarah (Clear US Female)'
  if (cleanName.includes('US English') && name.includes('Male')) return 'James (Clear US Male)'
  if (cleanName.includes('US English')) return 'Sarah (Clear US Female)' // Fallback
  if (cleanName.includes('UK English Male')) return 'Arthur (British Male)'
  if (cleanName.includes('UK English Female')) return 'Emma (British Female)'
  
  return cleanName || name;
}

export default function AIPodcastPage() {
  const [mounted, setMounted] = useState(false)
  const [topic, setTopic] = useState('')
  const [emotion, setEmotion] = useState('Professional')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [generatedScript, setGeneratedScript] = useState('')
  
  // Speech Synthesis state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Ensure hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load browser voices
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices()
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'))
      if (englishVoices.length > 0) {
        setVoices(englishVoices)
        const preferred = englishVoices.findIndex(v => 
          v.name.includes('Google US') || v.name.includes('Microsoft David') || v.name.includes('Daniel')
        )
        if (preferred !== -1) setSelectedVoiceIndex(preferred)
      } else if (allVoices.length > 0) {
        setVoices(allVoices)
      }
    }

    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [mounted])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic or article')
      return
    }

    setIsGenerating(true)
    setGeneratedScript('')
    setIsPlaying(false)
    setIsPaused(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    try {
      // Step 1: Generate the Podcast Script
      toast.loading('Writing podcast script...', { id: 'podcast' })
      const scriptRes = await fetch('/api/generate/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, emotion })
      })

      if (!scriptRes.ok) throw new Error('Failed to generate script')
      const scriptData = await scriptRes.json()
      setGeneratedScript(scriptData.script)

      toast.success('Podcast generated successfully!', { id: 'podcast' })

      // Auto-play with native browser speech engine!
      setTimeout(() => {
        handlePlaySpeech(scriptData.script)
      }, 500)

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'An error occurred', { id: 'podcast' })
    } finally {
      setIsGenerating(false)
    }
  }

  // Web Speech Playback
  const handlePlaySpeech = (textToSpeak = generatedScript) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('Speech synthesis is not supported in this browser.')
      return
    }
    if (!textToSpeak.trim()) return
    if (voices.length === 0) return

    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.voice = voices[selectedVoiceIndex]
      
      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e)
        setIsPlaying(false)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }, 100)
  }

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    } else if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      handlePlaySpeech()
    }
  }

  const handleStop = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  const handleExportAudio = async () => {
    if (!generatedScript.trim()) return

    setIsExporting(true)
    const exportToast = toast.loading('Preparing ultra-realistic MP3 download...')

    try {
      const response = await fetch('/api/tts/fish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedScript,
          reference_id: 'd8a1340984ee4b63ad1ffae27a6a4339', // Premium default fallback voice
          emotion: emotion
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export audio')
      }

      const data = await response.json()
      if (!data.audioBase64) {
        throw new Error('Failed to parse audio data')
      }

      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a')
      a.href = url
      a.download = `sovira-podcast-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Podcast exported successfully!', { id: exportToast })
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to export audio.', { id: exportToast })
    } finally {
      setIsExporting(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Mic className="w-6 h-6 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">AI Podcast Studio</h1>
          </div>
          <p className="text-slate-400 text-sm ml-14">
            Generate ultra-realistic podcasts in seconds
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input Controls */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Podcast Configuration
              </label>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Emotion & Tone</label>
                  <select 
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {EMOTIONS.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Podcast Voice</label>
                  <select 
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {voices.map((v, idx) => (
                      <option key={v.name + idx} value={idx}>{humanizeVoiceName(v.name)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">Topic or Source Article</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Paste an article URL, text, or just type a topic here. We will research it and write a highly engaging podcast script..."
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <PlaySquare className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating Podcast...' : 'Generate AI Podcast'}
            </button>
          </div>
        </div>

        {/* Right Column - Script & Audio Player */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 h-full min-h-[400px] flex flex-col relative overflow-hidden group">
            
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-2 mb-4">
              <AudioLines className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-300">Script & Audio Preview</h2>
            </div>

            {!generatedScript && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Mic className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Enter a topic to generate a podcast.</p>
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-400">
                <div className="flex items-end justify-center gap-1 h-12 mb-6">
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite] h-4"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite_0.2s] h-8"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite_0.4s] h-12"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite_0.6s] h-6"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite_0.8s] h-10"></div>
                </div>
                <p className="text-sm animate-pulse">Researching & Synthesizing Audio...</p>
              </div>
            )}

            {generatedScript && !isGenerating && (
              <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                    {generatedScript}
                  </p>
                </div>

                <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-4 sticky bottom-0 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      
                      {/* Play/Pause Control */}
                      <button 
                        onClick={handlePlayPause}
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-lg"
                      >
                        {isPlaying && !isPaused ? (
                          <Pause className="w-5 h-5 text-white" fill="currentColor" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                        )}
                      </button>

                      {/* Stop Control */}
                      <button 
                        onClick={handleStop}
                        disabled={!isPlaying && !isPaused}
                        className="w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 rounded-full flex items-center justify-center transition-colors shrink-0"
                      >
                        <Square className="w-4 h-4 text-white" fill="currentColor" />
                      </button>

                      <div className="text-sm hidden sm:block">
                        <p className="text-white font-medium">
                           {isPlaying && !isPaused ? 'Playing Podcast...' : isPaused ? 'Paused' : 'Ready'}
                        </p>
                        <p className="text-slate-400 text-xs">AI Voice Engine</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleExportAudio}
                      disabled={isExporting}
                      className="flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Export MP3
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
