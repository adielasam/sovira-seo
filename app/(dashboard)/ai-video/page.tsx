'use client'

import { useState, useEffect } from 'react'
import { Video, Image as ImageIcon, Play, Loader2, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AiVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video' | 'text-to-image'>('text-to-video')
  const [imageFile, setImageFile] = useState<File | null>(null)
  
  const [modelType, setModelType] = useState('veo3') // veo3, poppy, custom
  const [customModel, setCustomModel] = useState('')
  
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
    setStatusText(mode === 'image-to-video' ? 'Uploading image...' : 'Submitting job to ShortAPI...')

    try {
      let finalImageUrl = ''
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
        setStatusText('Submitting job to ShortAPI...')
      }

      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          prompt: (mode === 'text-to-video' || mode === 'text-to-image') ? prompt : undefined,
          image_url: mode === 'image-to-video' ? finalImageUrl : undefined,
          aspect_ratio: aspectRatio,
          modelType,
          customModel,
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
        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate high-quality short videos and images for your content.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 xl:col-span-1 h-fit">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setMode('text-to-video')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 min-w-max text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'text-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <FileText className="w-3.5 h-3.5" /> Text Video
            </button>
            <button
              type="button"
              onClick={() => setMode('image-to-video')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 min-w-max text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'image-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Img Video
            </button>
            <button
              type="button"
              onClick={() => setMode('text-to-image')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 min-w-max text-xs sm:text-sm font-medium rounded-md transition-all ${mode === 'text-to-image' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Text Image
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            
            <div>
              <label htmlFor="modelType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                AI Model
              </label>
              <select
                id="modelType"
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-3"
              >
                <option value="veo3">Google Veo 3.1 (High Quality Video)</option>
                <option value="poppy">Poppy V1.0 (Free/Cheap Video Test)</option>
                <option value="kling">Kling O3 (Video)</option>
                <option value="gpt-image">GPT Image 2 (Image Gen)</option>
                <option value="custom">Custom Model (Advanced)</option>
              </select>
              
              {modelType === 'custom' && (
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g. shortapi/poppy-v1.0/text-to-video"
                  className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              )}
            </div>

            {mode === 'text-to-video' || mode === 'text-to-image' ? (
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Video Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A cinematic drone shot of a futuristic city at sunset..."
                  rows={4}
                  className="block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="imageFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Upload Image
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
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Selected: {imageFile.name}</p>
                )}
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
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className={`max-w-full max-h-full rounded-lg shadow-2xl ${aspectRatio === '9:16' ? 'h-full w-auto' : 'w-full h-auto'}`}
                />
                
                <a 
                  href={videoUrl} 
                  download="sovira-ai-video.mp4"
                  target="_blank"
                  rel="noreferrer"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black text-white p-3 rounded-full backdrop-blur-md"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
