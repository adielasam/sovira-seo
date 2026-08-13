'use client'

import { useState } from 'react'
import { Mic, RefreshCw, AudioLines, Settings2, PlaySquare } from 'lucide-react'
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

// Default Fish Audio popular voices or allow custom ID
const VOICES = [
  { id: '5b67899dc9a34685ae09c94c890a606f', name: 'Essam (Arabic/Male)' },
  { id: 'd13f84b987ad4f22b56d2b47f4eb838e', name: 'Mortal Kombat (US/Male)' },
  { id: '52e0660e03fe4f9a8d2336f67cab5440', name: 'Alex Chikna (US/Fast)' },
  { id: 'd8a1340984ee4b63ad1ffae27a6a4339', name: 'ELITE (US/Professional)' },
  { id: 'custom', name: 'Custom Fish Audio Voice ID' }
]

export default function AIPodcastPage() {
  const [topic, setTopic] = useState('')
  const [emotion, setEmotion] = useState('Professional')
  const [voiceId, setVoiceId] = useState(VOICES[3].id)
  const [customVoiceId, setCustomVoiceId] = useState('')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic or article')
      return
    }

    const finalVoiceId = voiceId === 'custom' ? customVoiceId : voiceId
    if (!finalVoiceId) {
      toast.error('Please select or enter a Voice ID')
      return
    }

    setIsGenerating(true)
    setAudioUrl(null)
    setGeneratedScript('')
    setIsPlaying(false)

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

      // Step 2: Generate Audio with Fish Audio
      toast.loading('Generating ultra-realistic audio...', { id: 'podcast' })
      const audioRes = await fetch('/api/tts/fish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: scriptData.script, 
          reference_id: finalVoiceId,
          emotion: emotion 
        })
      })

      if (!audioRes.ok) throw new Error('Failed to generate audio')
      
      const audioData = await audioRes.json()
      if (!audioData.audioBase64) {
        throw new Error('Failed to parse audio data')
      }

      // Convert Base64 to Blob URL for playback
      const byteCharacters = atob(audioData.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url)

      // Auto-play
      setTimeout(() => {
        const audio = document.getElementById('podcast-audio') as HTMLAudioElement;
        if (audio) {
          audio.play().catch(e => console.error("Autoplay prevented:", e));
          setIsPlaying(true);
        }
      }, 500);

      toast.success('Podcast generated successfully!', { id: 'podcast' })

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'An error occurred', { id: 'podcast' })
    } finally {
      setIsGenerating(false)
    }
  }

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
            Powered by Fish Audio S2.1 Pro & Groq Llama 3
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
                  <label className="text-sm text-slate-300">Voice ID</label>
                  <select 
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {voiceId === 'custom' && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={customVoiceId}
                    onChange={(e) => setCustomVoiceId(e.target.value)}
                    placeholder="Enter Fish Audio Reference ID (e.g. 5b67899dc9a...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}
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

                {audioUrl && (
                  <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-4 sticky bottom-0 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            const audio = document.getElementById('podcast-audio') as HTMLAudioElement;
                            if (audio) {
                              if (isPlaying) audio.pause();
                              else audio.play();
                              setIsPlaying(!isPlaying);
                            }
                          }}
                          className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors shrink-0"
                        >
                          <div className={`w-3 h-3 ${isPlaying ? 'bg-white rounded-sm' : 'border-y-8 border-y-transparent border-l-[12px] border-l-white ml-1'}`} />
                        </button>
                        <div className="text-sm">
                          <p className="text-white font-medium">Podcast Generated</p>
                          <p className="text-slate-400 text-xs">Fish Audio S2.1 Pro</p>
                        </div>
                      </div>
                      
                      <a 
                        href={audioUrl} 
                        download="ai-podcast.mp3"
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Download MP3
                      </a>
                    </div>
                    
                    <audio 
                      id="podcast-audio" 
                      src={audioUrl} 
                      onEnded={() => setIsPlaying(false)}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      controls
                      className="w-full h-8 outline-none [&::-webkit-media-controls-panel]:bg-slate-800 [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-time-remaining-display]:text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
