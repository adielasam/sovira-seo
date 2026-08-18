'use client'

import { useState, useEffect, useRef } from 'react'
import { PlaySquare, Download, Volume2, VolumeX, Mic, Settings, Play, Square, Loader2, Pause } from 'lucide-react'
import toast from 'react-hot-toast'

const humanizeVoiceName = (name: string, isAlgorithmicNG = false) => {
  let cleanName = name
    .replace(/Microsoft |Google |Apple /gi, '')
    .replace(/ - English \([^)]+\)/gi, '')
    .replace(/ \([^)]+\)/g, '')
    .replace(/Desktop|Online \(Natural\)/gi, '')
    .trim();
  
  if (isAlgorithmicNG) {
    if (cleanName.includes('Arthur') || name.includes('Male')) return 'Chinedu (Professional Nigerian Male)'
    if (cleanName.includes('Emma') || name.includes('Female')) return 'Ngozi (Professional Nigerian Female)'
    return `${cleanName} (Nigerian Professional)`
  }

  // Native Nigerian voices if they exist
  if (name.includes('Abeo')) return 'Abeo (Premium Nigerian Male)'
  if (name.includes('Nneka')) return 'Nneka (Premium Nigerian Female)'
  if (name.toLowerCase().includes('nigeria')) return `${cleanName} (Premium Nigerian)`

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

export type VoiceOption = {
  voice: SpeechSynthesisVoice;
  isAlgorithmicNG: boolean;
  id: string;
};

export default function TextToSpeechPage() {
  const [mounted, setMounted] = useState(false)
  const [script, setScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [hasGenerated, setHasGenerated] = useState(false)
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Ensure hydration safety by rendering only after component mounts on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load browser voices and generate Nigerian algorithmic voices
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices()
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'))
      
      let options: VoiceOption[] = []
      
      if (englishVoices.length > 0) {
        // Native voices
        options = englishVoices.map(v => ({ voice: v, isAlgorithmicNG: false, id: v.name }))
        
        // Generate Algorithmic Nigerian Voices from British voices (en-GB)
        // Nigerian professional accents are structurally close to British, but usually spoken with a distinct cadence and resonance.
        const gbVoices = englishVoices.filter(v => v.lang === 'en-GB')
        gbVoices.forEach(v => {
          options.push({
            voice: v,
            isAlgorithmicNG: true,
            id: `algo-ng-${v.name}`
          })
        })
        
        setVoiceOptions(options)
        
        // Default to the first Nigerian algorithmic voice, or native fallback
        const preferred = options.find(o => o.isAlgorithmicNG) || options[0]
        if (preferred) setSelectedVoiceId(preferred.id)
      } else if (allVoices.length > 0) {
        options = allVoices.map(v => ({ voice: v, isAlgorithmicNG: false, id: v.name }))
        setVoiceOptions(options)
        setSelectedVoiceId(options[0].id)
      }
    }
    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [mounted])

  // Web Speech Playback
  const handlePlaySpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('Speech synthesis is not supported in this browser.')
      return
    }

    if (!script.trim()) {
      toast.error('Please enter a script to generate speech.')
      return
    }
    if (voiceOptions.length === 0) {
      toast.error('No voices available in your browser.')
      return
    }

    const selectedOption = voiceOptions.find(o => o.id === selectedVoiceId)
    if (!selectedOption) return;

    // Reset synthesis
    window.speechSynthesis.cancel()

    setIsGenerating(true)
    setHasGenerated(false)
    setIsPlaying(false)
    setIsPaused(false)

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(script)
      utterance.voice = selectedOption.voice
      
      // ALGORITHMIC NIGERIAN ACCENT TWEAKS
      if (selectedOption.isAlgorithmicNG) {
        // Professional Nigerian English is often spoken at a more measured pace and lower, steadier pitch than standard British
        utterance.rate = rate * 0.85; // 15% slower for deliberate, clear enunciation
        utterance.pitch = pitch * 0.90; // 10% deeper resonance
      } else {
        utterance.rate = rate
        utterance.pitch = pitch
      }
      
      utterance.volume = isMuted ? 0 : 1

      utterance.onstart = () => {
        setIsGenerating(false)
        setHasGenerated(true)
        setIsPlaying(true)
        setIsPaused(false)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e)
        setIsGenerating(false)
        setIsPlaying(false)
        toast.error('Speech synthesis error. Try a different voice.')
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }, 100)
  }

  // Play/Pause control
  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || isGenerating) return

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

  // Stop control
  const handleStop = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  // Mute/Unmute control
  const handleToggleMute = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    
    // Web Speech API doesn't let us dynamically change volume mid-speech on all browsers,
    // so we re-speak if currently playing, or let the next speak be muted/unmuted.
    if (isPlaying) {
      window.speechSynthesis.cancel()
      const selectedOption = voiceOptions.find(o => o.id === selectedVoiceId)
      if (!selectedOption) return;

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(script)
        utterance.voice = selectedOption.voice
        if (selectedOption.isAlgorithmicNG) {
          utterance.rate = rate * 0.85
          utterance.pitch = pitch * 0.90
        } else {
          utterance.rate = rate
          utterance.pitch = pitch
        }
        utterance.volume = nextMuted ? 0 : 1
        
        utterance.onstart = () => {
          setIsPlaying(true)
          setIsPaused(false)
        }
        utterance.onend = () => {
          setIsPlaying(false)
          setIsPaused(false)
        }
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }, 50)
    }
  }

  // Export to MP3 using serverless Fish Audio Pro-Free engine
  const handleExportAudio = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script to export.')
      return
    }

    setIsExporting(true)
    const exportToast = toast.loading('Preparing MP3 download...')

    try {
      const response = await fetch('/api/tts/fish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          reference_id: 'd8a1340984ee4b63ad1ffae27a6a4339' // Adam (US Male) default fallback for export
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

      // Convert Base64 to Blob URL and trigger download
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
      a.download = `voiceover-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Audio exported successfully!', { id: exportToast })
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to export audio.', { id: exportToast })
    } finally {
      setIsExporting(false)
    }
  }

  // Render a clean loading skeleton on the server side to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 w-1/4 rounded"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 w-2/3 mt-2 rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-white dark:bg-[#1E293B] rounded-xl lg:col-span-1 border border-slate-200 dark:border-slate-800"></div>
          <div className="h-96 bg-slate-900 dark:bg-[#0B0F19] rounded-xl lg:col-span-2"></div>
        </div>
      </div>
    )
  }

  // Group voices by region and premium status
  const ngPremiumVoices = voiceOptions.filter(o => o.isAlgorithmicNG || o.voice.name.includes('Abeo') || o.voice.name.includes('Nneka') || o.voice.name.toLowerCase().includes('nigeria'))
  
  // Standard voices (excluding the ones already in Premium NG)
  const standardVoices = voiceOptions.filter(o => !ngPremiumVoices.includes(o))
  const usVoices = standardVoices.filter(o => o.voice.lang === 'en-US')
  const gbVoices = standardVoices.filter(o => o.voice.lang === 'en-GB')
  const otherVoices = standardVoices.filter(o => !['en-US', 'en-GB'].includes(o.voice.lang))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mic className="w-8 h-8 text-blue-500" />
          Text to Speech
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Generate voiceovers instantly using your browser&apos;s speech engine, and export them as high-quality MP3s.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Controls */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-1 h-fit flex flex-col space-y-6">
          
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-3">
              Voice
            </label>
            <div className="relative">
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="block w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {ngPremiumVoices.length > 0 && (
                  <optgroup label="🇳🇬 Nigerian (Premium)">
                    {ngPremiumVoices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {humanizeVoiceName(opt.voice.name, opt.isAlgorithmicNG)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {usVoices.length > 0 && (
                  <optgroup label="🇺🇸 United States">
                    {usVoices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {humanizeVoiceName(opt.voice.name)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {gbVoices.length > 0 && (
                  <optgroup label="🇬🇧 United Kingdom">
                    {gbVoices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {humanizeVoiceName(opt.voice.name)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherVoices.length > 0 && (
                  <optgroup label="🌍 Other English">
                    {otherVoices.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {humanizeVoiceName(opt.voice.name)} ({opt.voice.lang})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <Settings className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Speed & Pitch Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                Speed ({rate}x)
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
                Pitch ({pitch})
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-3">
              Script
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Type or paste your script here..."
              className="block w-full h-48 px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs font-medium text-slate-500">
                {script.length} / 5000 chars
              </span>
            </div>
          </div>

          <button
            onClick={handlePlaySpeech}
            disabled={isGenerating || script.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlaySquare className="w-5 h-5" />
            )}
            {isGenerating ? 'Generating...' : 'Generate & Play'}
          </button>
        </div>

        {/* Right Panel - Preview/Timeline */}
        <div className="bg-slate-900 dark:bg-[#0B0F19] rounded-xl shadow-inner ring-1 ring-slate-800 lg:col-span-2 flex flex-col h-[400px] lg:h-[600px] overflow-hidden relative">
          
          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center bg-black/40 relative">
            {!hasGenerated && !isGenerating && (
              <div className="text-center text-slate-500 flex flex-col items-center">
                <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
                <p className="font-medium">No audio generated yet.</p>
                <p className="text-xs sm:text-sm opacity-70">Enter a script and click Generate to play.</p>
              </div>
            )}
            {isGenerating && (
              <div className="text-center text-blue-400 flex flex-col items-center animate-pulse">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 mb-4 animate-spin opacity-80" />
                <p className="font-medium text-sm sm:text-base">Synthesizing Voiceover...</p>
              </div>
            )}
            {hasGenerated && !isGenerating && (
              <div className="w-48 sm:w-64 h-64 sm:h-96 bg-black rounded-lg shadow-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-blue-600/30 to-transparent"></div>
                {isPlaying && !isPaused ? (
                  <div className="flex items-end justify-center gap-1 h-8 sm:h-12 z-10 opacity-80">
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite] h-full"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm animate-[bounce_1.2s_ease-in-out_infinite] h-4/5"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm animate-[bounce_0.8s_ease-in-out_infinite] h-3/5"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm animate-[bounce_1.1s_ease-in-out_infinite] h-full"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm animate-[bounce_0.9s_ease-in-out_infinite] h-2/5"></div>
                  </div>
                ) : (
                  <div className="flex items-end justify-center gap-1 h-8 sm:h-12 z-10 opacity-40">
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm h-3"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm h-5"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm h-4"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm h-6"></div>
                    <div className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm h-2"></div>
                  </div>
                )}
                <div className="absolute bottom-4 sm:bottom-6 text-center text-white z-10">
                  <p className="text-[10px] sm:text-xs font-medium opacity-60">
                    {isPlaying && !isPaused ? '● Speaking...' : isPaused ? '❚❚ Paused' : '■ Stopped'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="h-16 sm:h-20 bg-blue-600 text-white flex items-center px-4 sm:px-6 justify-between shadow-[0_-4px_20px_rgba(37,99,235,0.15)] shrink-0 z-10 relative">
            <div className="hidden sm:flex items-center gap-4 w-1/3">
              <span className="text-xs font-mono font-medium opacity-90 truncate max-w-full">
                {voiceOptions.find(o => o.id === selectedVoiceId) 
                  ? humanizeVoiceName(voiceOptions.find(o => o.id === selectedVoiceId)!.voice.name, voiceOptions.find(o => o.id === selectedVoiceId)!.isAlgorithmicNG) 
                  : 'No voice'}
              </span>
            </div>
            
            <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-6 flex-1 sm:w-1/3">
              <button 
                onClick={handleStop}
                disabled={!isPlaying && !isPaused}
                className="p-1.5 sm:p-2 hover:bg-blue-500 rounded-full transition-colors opacity-70 hover:opacity-100 disabled:opacity-30"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              </button>
              <button 
                onClick={handlePlayPause}
                disabled={script.length === 0}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-blue-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
              >
                {isPlaying && !isPaused ? (
                   <Pause className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                ) : (
                   <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-1" fill="currentColor" />
                )}
              </button>
              <button 
                onClick={handleToggleMute}
                className="p-1.5 sm:p-2 hover:bg-blue-500 rounded-full transition-colors opacity-70 hover:opacity-100"
              >
                {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-end w-auto sm:w-1/3">
              {script.trim().length > 0 && (
                <button
                  onClick={handleExportAudio}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 sm:gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                >
                  {isExporting ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3 h-3 sm:w-4 sm:h-4" />}
                  Export <span className="hidden sm:inline">MP3</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
