'use client'

import { useState, useEffect, useRef } from 'react'
import { Video, Image as ImageIcon, Play, Loader2, Download, FileText, Volume2, VolumeX, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AiVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [dialogue, setDialogue] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video' | 'text-to-image'>('text-to-video')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')

  // Polling mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      if (!jobId) return

      try {
        const res = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', jobId })
        })
        const data = await res.json()

        if (res.ok) {
          if (data.status === 'success' || data.status === 'completed') {
            setVideoUrl(data.result_url || data.video_url || data.url)
            setIsGenerating(false)
            setJobId(null)
            toast.success('Video generation complete!')
          } else if (data.status === 'failed' || data.status === 'error') {
            toast.error(data.error || 'Video generation failed')
            setIsGenerating(false)
            setJobId(null)
          } else {
            setStatusText(`Status: ${data.status || 'processing'}...`)
          }
        }
      } catch (e) {
        console.error('Error checking status', e)
      }
    }

    if (jobId && isGenerating) {
      interval = setInterval(checkStatus, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [jobId, isGenerating])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'text-to-video' && !prompt) {
      toast.error('Please enter a prompt')
      return
    }
    if (mode === 'image-to-video' && !imageFile) {
      toast.error('Please upload an image')
      return
    }

    setIsGenerating(true)
    setVideoUrl(null)
    setJobId(null)
    setStatusText(mode === 'image-to-video' ? 'Uploading image...' : 'Initializing Sovira Engine...')

    try {
      let finalImageUrl = ''
      
      // Enhance the user prompt with cinematic quality descriptors
      const enhancePrompt = (userPrompt: string) => {
        const qualityBoost = 'Ultra-realistic, cinematic 4K quality, professional film production, dramatic lighting, shallow depth of field, photorealistic textures, film grain, IMAX quality, hyper-detailed, award-winning cinematography.'
        const negative = 'Avoid: cartoon, anime, low quality, blurry, childish, toy-like, CGI artifacts, watermark, text overlay.'
        return `${userPrompt.trim()}. ${qualityBoost} ${negative}`
      }

      if (mode === 'image-to-video' && imageFile) {
        // Upload image
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(imageFile)
        })
        
        const base64Data = await base64Promise
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: base64Data, fileName: imageFile.name })
        })
        
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok || !uploadData.url) {
          toast.error(uploadData.error || 'Failed to upload image')
          setIsGenerating(false)
          return
        }
        finalImageUrl = uploadData.url
        setStatusText('Initializing Sovira Engine...')
      }

      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          prompt: mode === 'text-to-video' ? prompt : (prompt || undefined),
          image_url: mode === 'image-to-video' ? finalImageUrl : undefined,
          aspect_ratio: aspectRatio,
          duration,
          mode
        })
      })
      const data = await res.json()
      
      if (res.ok && data.id) {
        setJobId(data.id)
        setStatusText('Job created. Waiting for video rendering...')
        toast.success('Video job submitted!')
      } else {
        toast.error(data.error || 'Failed to submit job')
        setIsGenerating(false)
      }
    } catch (error) {
      toast.error('An error occurred while submitting')
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="w-8 h-8 text-indigo-500" />
          AI Generation Studio
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate cinematic videos for YouTube & TikTok using our proprietary AI engine.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 xl:col-span-1 h-fit">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('text-to-video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'text-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <FileText className="w-4 h-4" /> Text Video
            </button>
            <button
              type="button"
              onClick={() => setMode('image-to-video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'image-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <ImageIcon className="w-4 h-4" /> Image Video
            </button>
            <button
              type="button"
              onClick={() => setMode('text-to-image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${mode === 'text-to-image' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <ImageIcon className="w-4 h-4" /> Text Image
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            
            <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">✨ Sovira Cinematic Engine</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-auto">Ultra-realistic 4K</span>
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {mode === 'image-to-video' ? 'Animation Prompt (Optional)' : (mode === 'text-to-image' ? 'Image Generation Prompt' : 'Video Prompt')}
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'image-to-video' ? 'Describe how to animate the image...' : 'e.g. Ultra-realistic 3D cinematic Nigerian woman, standing in a modern living room...'}
                rows={5}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            {mode === 'image-to-video' && (
              <div>
                <label htmlFor="imageFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Reference Image
                </label>
                <input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0])
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 cursor-pointer border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A]"
                />
                {imageFile && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">✅ {imageFile.name}</p>
                )}
              </div>
            )}

            {/* Dialogue / Narration */}
            <div>
              <label htmlFor="dialogue" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Character Dialogue / Narration
                <span className="ml-2 text-xs text-slate-400">(for voice preview & lip sync)</span>
              </label>
              <textarea
                id="dialogue"
                value={dialogue}
                onChange={(e) => setDialogue(e.target.value)}
                placeholder="Write what the character says... e.g. 'Good morning! I prepared breakfast for you. How are you feeling today?'"
                rows={3}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
              {dialogue && (
                <button
                  type="button"
                  onClick={() => {
                    if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel()
                      const utterance = new SpeechSynthesisUtterance(dialogue)
                      utterance.rate = 0.9
                      utterance.pitch = 1.1
                      window.speechSynthesis.speak(utterance)
                      toast.success('Playing voice preview...')
                    } else {
                      toast.error('Speech synthesis not supported in this browser')
                    }
                  }}
                  className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Preview voice
                </button>
            </div>

            {mode !== 'text-to-image' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Duration: <span className="text-indigo-500 font-bold">{duration}s</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>3s</span><span>5s</span><span>7s</span><span>10s</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`
                  flex items-center justify-center px-3 py-3 border rounded-lg cursor-pointer transition-colors
                  ${aspectRatio === '16:9' 
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input type="radio" name="ratio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="sr-only" />
                  <div className="text-center">
                    <div className="w-8 h-4 border-2 border-current mx-auto mb-1 rounded-sm" />
                    <p className="font-medium text-sm">16:9 (Landscape)</p>
                  </div>
                </label>

                <label className={`
                  flex items-center justify-center px-3 py-3 border rounded-lg cursor-pointer transition-colors
                  ${aspectRatio === '9:16' 
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}>
                  <input type="radio" name="ratio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="sr-only" />
                  <div className="text-center">
                    <div className="w-4 h-8 border-2 border-current mx-auto mb-1 rounded-sm" />
                    <p className="font-medium text-sm">9:16 (Portrait)</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isGenerating ? 'Generating...' : (mode === 'text-to-image' ? 'Generate Image' : 'Generate Video')}
            </button>
          </form>
        </div>

        {/* Right Panel - Output */}
        <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 xl:col-span-2 flex flex-col h-[600px] xl:h-[700px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0F172A] rounded-t-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400" />
              Studio Output
            </h3>
          </div>
          
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-900 relative rounded-b-xl overflow-hidden">
            {!videoUrl && !isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Video className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-slate-400">Your generated video will appear here.</p>
              </div>
            ) : isGenerating ? (
              <div className="text-center space-y-6 w-full max-w-sm">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="animate-spin w-full h-full text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-white mb-2">{statusText}</p>
                  <p className="text-sm text-slate-400">This process can take a few minutes. Please don't close this tab.</p>
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative group">
                {videoUrl.endsWith('.png') || videoUrl.endsWith('.jpg') || videoUrl.endsWith('.jpeg') || mode === 'text-to-image' ? (
                  <img 
                    src={videoUrl} 
                    alt="Generated output"
                    className={`max-w-full max-h-full rounded-lg shadow-2xl ${aspectRatio === '9:16' ? 'h-full w-auto' : 'w-full h-auto'}`}
                  />
                ) : (
                  <video 
                    ref={videoRef}
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    loop
                    playsInline
                    muted={isMuted}
                    className={`max-w-full max-h-full rounded-lg shadow-2xl ${aspectRatio === '9:16' ? 'h-full w-auto' : 'w-full h-auto'}`}
                    style={{ outline: 'none' }}
                  />
                )}

                {/* Floating action bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <a 
                    href={videoUrl} 
                    download="sovira-ai-video.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-black/70 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-md transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download MP4
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const newMuted = !isMuted
                      setIsMuted(newMuted)
                      if (videoRef.current) videoRef.current.muted = newMuted
                    }}
                    className="flex items-center gap-2 bg-black/70 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-md transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
