'use client'

import { useState } from 'react'
import { PlaySquare, Download, Volume2, Mic, Settings, Play, Square, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const VOICES = [
  { id: 'adam', name: 'Adam', description: 'Dominant, Firm', region: 'US' },
  { id: 'rachel', name: 'Rachel', description: 'Calm, Professional', region: 'US' },
  { id: 'chidi', name: 'Chidi', description: 'Warm, Engaging', region: 'NG' },
  { id: 'ezinne', name: 'Ezinne', description: 'Clear, Authoritative', region: 'NG' },
  { id: 'antoni', name: 'Antoni', description: 'Friendly, Storyteller', region: 'US' },
]

export default function TextToSpeechPage() {
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)
  const [script, setScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleGenerate = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script to generate speech.')
      return
    }

    setIsGenerating(true)
    setAudioUrl(null)

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          voiceId: selectedVoice
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate audio')
      }

      const data = await response.json()
      if (!data.audioBase64) {
        throw new Error('Failed to parse audio data')
      }

      // Convert base64 safely to a playable Data URI
      const url = `data:audio/mp3;base64,${data.audioBase64}`
      setAudioUrl(url)
      
      // Auto-play the audio once it's ready
      setTimeout(() => {
        const audio = document.getElementById('tts-audio') as HTMLAudioElement;
        if (audio) {
          audio.play().catch(e => console.error("Autoplay prevented:", e));
          setIsPlaying(true);
        }
      }, 500);

      toast.success('Voiceover generated successfully!')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'An error occurred during generation.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mic className="w-8 h-8 text-blue-500" />
          Text to Speech
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate high-quality voiceovers with premium global and regional voices.</p>
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
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="block w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <optgroup label="United States (US)">
                  {VOICES.filter(v => v.region === 'US').map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Nigeria (NG)">
                  {VOICES.filter(v => v.region === 'NG').map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <Settings className="w-4 h-4" />
              </div>
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
                {script.length} / 2500 chars
              </span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || script.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlaySquare className="w-5 h-5" />
            )}
            {isGenerating ? 'Generating Audio...' : 'Generate & Insert'}
          </button>
        </div>

        {/* Right Panel - Preview/Timeline */}
        <div className="bg-slate-900 dark:bg-[#0B0F19] rounded-xl shadow-inner ring-1 ring-slate-800 lg:col-span-2 flex flex-col h-[600px] overflow-hidden relative">
          
          {/* Mock Video Canvas Area */}
          <div className="flex-1 flex items-center justify-center bg-black/40 relative">
            {!audioUrl && !isGenerating && (
              <div className="text-center text-slate-500 flex flex-col items-center">
                <Volume2 className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">No audio generated yet.</p>
                <p className="text-sm opacity-70">Enter a script and click Generate to preview.</p>
              </div>
            )}
            {isGenerating && (
              <div className="text-center text-blue-400 flex flex-col items-center animate-pulse">
                <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-80" />
                <p className="font-medium">Synthesizing Voiceover...</p>
              </div>
            )}
            {audioUrl && (
              <div className="w-64 h-96 bg-black rounded-lg shadow-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                {/* Visualizer bars mock */}
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-blue-600/30 to-transparent"></div>
                <div className="flex items-end justify-center gap-1 h-12 z-10 opacity-80">
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1s_ease-in-out_infinite] h-full"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1.2s_ease-in-out_infinite] h-4/5"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_0.8s_ease-in-out_infinite] h-3/5"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_1.1s_ease-in-out_infinite] h-full"></div>
                  <div className="w-2 bg-blue-500 rounded-t-sm animate-[bounce_0.9s_ease-in-out_infinite] h-2/5"></div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline & Controls Bar */}
          <div className="h-20 bg-blue-600 text-white flex items-center px-6 justify-between shadow-[0_-4px_20px_rgba(37,99,235,0.15)] shrink-0 z-10 relative">
            <div className="flex items-center gap-4 w-1/3">
              <span className="text-sm font-mono font-medium opacity-90">00:00:00 / 00:00:00</span>
            </div>
            
            <div className="flex items-center justify-center gap-6 w-1/3">
              <button className="p-2 hover:bg-blue-500 rounded-full transition-colors opacity-70 hover:opacity-100">
                <Square className="w-5 h-5" fill="currentColor" />
              </button>
              <button 
                onClick={() => {
                  const audio = document.getElementById('tts-audio') as HTMLAudioElement;
                  if (audio) {
                    if (isPlaying) {
                      audio.pause();
                    } else {
                      audio.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                disabled={!audioUrl}
                className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
              >
                {isPlaying ? (
                   <Square className="w-5 h-5 ml-0.5" fill="currentColor" />
                ) : (
                   <Play className="w-6 h-6 ml-1" fill="currentColor" />
                )}
              </button>
              <button className="p-2 hover:bg-blue-500 rounded-full transition-colors opacity-70 hover:opacity-100">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-end w-1/3">
              {audioUrl && (
                <a
                  href={audioUrl}
                  download="sovira-voiceover.mp3"
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Audio
                </a>
              )}
            </div>

            {audioUrl && (
               <audio 
                 id="tts-audio" 
                 src={audioUrl} 
                 onEnded={() => setIsPlaying(false)}
                 onPause={() => setIsPlaying(false)}
                 onPlay={() => setIsPlaying(true)}
                 className="hidden" 
               />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
