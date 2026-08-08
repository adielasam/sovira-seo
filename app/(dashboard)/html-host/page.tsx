'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Play, Upload, Code, Copy, Check, ExternalLink, Loader2, FolderArchive, FileCode2, Globe, Command, Trash2, Eye, Monitor, Smartphone, Tablet, Maximize2, X } from 'lucide-react'
import JSZip from 'jszip'
import confetti from 'canvas-confetti'

export default function HtmlHostPage() {
  const [mode, setMode] = useState<'landing' | 'editor'>('landing')
  const [htmlContent, setHtmlContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [hostedUrl, setHostedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [filesPreview, setFilesPreview] = useState<{path: string, type: string}[]>([])
  
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'phone'>('desktop')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Live preview update
  useEffect(() => {
    if (mode === 'editor' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent, mode, devicePreview])

  // Handle global paste event when in landing mode
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (mode === 'landing') {
        const text = e.clipboardData?.getData('text')
        if (text && (text.includes('<html') || text.includes('<div') || text.includes('<!DOCTYPE'))) {
          setHtmlContent(text)
          setMode('editor')
        }
      }
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [mode])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const getMimeType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'html': return 'text/html'
      case 'css': return 'text/css'
      case 'js': return 'application/javascript'
      case 'json': return 'application/json'
      case 'svg': return 'image/svg+xml'
      case 'png': return 'image/png'
      case 'jpg':
      case 'jpeg': return 'image/jpeg'
      case 'gif': return 'image/gif'
      case 'webp': return 'image/webp'
      case 'ico': return 'image/x-icon'
      case 'woff': return 'font/woff'
      case 'woff2': return 'font/woff2'
      case 'ttf': return 'font/ttf'
      case 'eot': return 'application/vnd.ms-fontobject'
      case 'otf': return 'font/otf'
      case 'mp4': return 'video/mp4'
      case 'mp3': return 'audio/mpeg'
      case 'pdf': return 'application/pdf'
      default: return 'text/plain'
    }
  }

  const isBinaryMimeType = (mimeType: string) => {
    return (
      (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') ||
      mimeType.startsWith('font/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/vnd.ms-fontobject'
    )
  }

  const processDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer?.files[0]
    if (!file) return

    await handleFile(file)
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleFile(file)
  }

  const handleFile = async (file: File) => {
    const isZip = file.name.toLowerCase().endsWith('.zip') || 
                  file.type === 'application/zip' || 
                  file.type === 'application/x-zip-compressed' ||
                  file.type.includes('zip')

    if (isZip) {
      // Process ZIP
      try {
        const zip = new JSZip()
        const contents = await zip.loadAsync(file)
        
        const filePaths = Object.keys(contents.files).filter(p => !contents.files[p].dir)
        let rootPrefix = ''
        if (filePaths.length > 0) {
          const firstPathParts = filePaths[0].split('/')
          if (firstPathParts.length > 1) {
            const potentialRoot = firstPathParts[0] + '/'
            if (filePaths.every(p => p.startsWith(potentialRoot))) {
              rootPrefix = potentialRoot
            }
          }
        }
        
        const extractedFiles: {path: string, content: string, type: string, isBinary: boolean}[] = []
        
        for (const [path, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir) {
            const cleanPath = path.startsWith(rootPrefix) ? path.substring(rootPrefix.length) : path
            const type = getMimeType(cleanPath)
            const isBinary = isBinaryMimeType(type)
            
            // Read as base64 if binary, else as utf-8 string
            const content = await zipEntry.async(isBinary ? 'base64' : 'string')
            
            extractedFiles.push({
              path: cleanPath,
              content,
              type,
              isBinary
            })
          }
        }
        
        if (extractedFiles.length > 0) {
          setFilesPreview(extractedFiles.map(f => ({ path: f.path, type: f.type })))
          const indexFile = extractedFiles.find(f => f.path.toLowerCase() === 'index.html') || extractedFiles.find(f => f.path.endsWith('.html'))
          if (indexFile && !indexFile.isBinary) {
            setHtmlContent(indexFile.content)
          } else if (extractedFiles[0] && !extractedFiles[0].isBinary) {
            setHtmlContent(extractedFiles[0].content)
          }
          setMode('editor')
          await uploadFiles(extractedFiles)
        }
      } catch (err) {
        console.error('ZIP extraction failed', err)
        alert('Failed to read ZIP file. Make sure it contains text/HTML files.')
      }
    } else if (file.name.toLowerCase().endsWith('.html') || file.type === 'text/html') {
      // Process Single HTML
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        setHtmlContent(text)
        setMode('editor')
        await uploadFiles([{ path: 'index.html', content: text, type: 'text/html', isBinary: false }])
      }
      reader.readAsText(file)
    } else {
      alert('Please drop an HTML file or a ZIP file. Recognized type: ' + file.type)
    }
  }

  const handlePublish = async () => {
    await uploadFiles([{ path: 'index.html', content: htmlContent, type: 'text/html', isBinary: false }])
  }

  const uploadFiles = async (files: {path: string, content: string, type: string, isBinary: boolean}[]) => {
    setIsUploading(true)
    setHostedUrl('')
    try {
      let currentSlug = ''
      let finalUrl = ''
      
      // Upload sequentially to avoid Next.js 4.5MB serverless payload limits
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await fetch('/api/html-host/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [file], slug: currentSlug })
        })
        
        const data = await res.json()
        if (res.ok) {
          currentSlug = data.slug
          finalUrl = data.url
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      }
      
      setHostedUrl(finalUrl)
      setShowSuccessModal(true)
      
      // Trigger a beautiful confetti animation!
      const duration = 3000
      const end = Date.now() + duration
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#2563eb', '#3b82f6', '#93c5fd'] // Sovira blues
        })
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#2563eb', '#3b82f6', '#93c5fd']
        })
        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
      
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Upload failed due to network error')
    } finally {
      setIsUploading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(hostedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!hostedUrl) return
    const slug = hostedUrl.split('/').pop()
    if (!slug) return
    if (!confirm('Are you sure you want to delete this site?')) return
    
    setIsUploading(true) // Reuse loader state
    try {
      const res = await fetch(`/api/html-host/delete?slug=${slug}`, { method: 'DELETE' })
      if (res.ok) {
        setHostedUrl('')
        alert('Site deleted successfully!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete site')
      }
    } catch (err) {
      console.error(err)
      alert('Delete failed due to network error')
    } finally {
      setIsUploading(false)
    }
  }

  const getProjectTitle = () => {
    const match = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match ? match[1].trim() : 'Untitled Project'
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    let newHtml = htmlContent
    if (newHtml.match(/<title[^>]*>([^<]+)<\/title>/i)) {
      newHtml = newHtml.replace(/(<title[^>]*>)([^<]+)(<\/title>)/i, `$1${newTitle}$3`)
    } else {
      if (newHtml.includes('<head>')) {
        newHtml = newHtml.replace('<head>', `<head>\n  <title>${newTitle}</title>`)
      } else if (newHtml.includes('<html>')) {
        newHtml = newHtml.replace('<html>', `<html>\n<head>\n  <title>${newTitle}</title>\n</head>`)
      } else {
        newHtml = `<title>${newTitle}</title>\n` + newHtml
      }
    }
    setHtmlContent(newHtml)
  }

  const getProjectSize = () => {
    return (new Blob([htmlContent]).size / 1024).toFixed(1) + ' KB'
  }

  const lineCount = useMemo(() => htmlContent.split('\n').length, [htmlContent])

  if (mode === 'landing') {
    return (
      <div 
        className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0F19] text-white font-sans relative overflow-hidden items-center justify-center"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={processDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          className="hidden" 
          accept=".html,.zip,application/zip,application/x-zip-compressed"
        />

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-4 border-dashed border-blue-600/50 m-4 rounded-xl flex flex-col items-center justify-center">
            <FolderArchive className="w-20 h-20 text-blue-500 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-white mb-2">Drop to Deploy</h2>
            <p className="text-blue-200">ZIP folders or HTML files</p>
          </div>
        )}

        <div className="flex flex-col items-center max-w-2xl w-full px-6 text-center">
          {/* Top Icon Box */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-2xl bg-[#131B2C] border border-slate-800 flex items-center justify-center mb-8 cursor-pointer hover:border-blue-500/50 hover:bg-[#1A2438] transition-all group"
          >
            <Upload className="w-6 h-6 text-blue-500 group-hover:-translate-y-1 transition-transform" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Paste HTML, drop a file, or upload a ZIP
          </h1>
          <p className="text-slate-400 text-lg mb-10 flex items-center justify-center gap-2">
            Just press <kbd className="px-2 py-1 bg-slate-800 rounded-md border border-slate-700 text-sm font-mono flex items-center gap-1"><Command className="w-3 h-3"/>V</kbd> or click to upload HTML files, folders, or ZIP.
          </p>

          <div className="flex items-center w-full max-w-md mb-10">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="px-4 text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <button 
              onClick={() => {
                setHtmlContent(`<!DOCTYPE html>\n<html>\n<head>\n  <title>My Site</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 2rem; }\n    h1 { color: #2563eb; }\n  </style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Start typing HTML here...</p>\n</body>\n</html>`)
                setMode('editor')
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-transparent border border-slate-700 hover:border-slate-500 transition-colors"
            >
              <Code className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Paste HTML</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-transparent hover:text-white text-slate-300 transition-colors"
            >
              <span className="font-medium">Upload folder</span>
            </button>
            <button 
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-transparent text-slate-400 opacity-70 cursor-not-allowed"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium">Clone from URL</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded-sm ml-1">PRO</span>
            </button>
          </div>

          <p className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors text-sm mb-12">
            or try a sample →
          </p>

          <p className="text-blue-500 font-mono text-sm tracking-tight">
            no signup required
          </p>
        </div>
      </div>
    )
  }

  // EDITOR MODE
  return (
    <div 
      className="flex flex-col h-[calc(100vh-4rem)] bg-[#0A0A0A] text-slate-300 font-sans relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={processDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept=".html,.zip,application/zip,application/x-zip-compressed"
      />

      {/* Header - Dark IDE Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] bg-[#111111]">
        
        {/* Left: Back & Project Info */}
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => setMode('landing')}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back
          </button>
          
          <div className="h-4 w-px bg-slate-800" />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 border border-slate-700/50 rounded px-1.5 py-0.5 font-mono">
              PROJECT
            </span>
            <input 
              value={getProjectTitle()}
              onChange={handleTitleChange}
              title="Edit project name"
              className="text-sm font-medium text-slate-200 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-0 max-w-[200px] truncate"
            />
            {hostedUrl && (
              <>
                <span className="text-slate-600">|</span>
                <a 
                  href={hostedUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate max-w-[200px] flex items-center gap-1"
                >
                  {hostedUrl.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePublish}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              hostedUrl 
                ? 'bg-[#1A1A1A] text-green-400 border border-green-500/30 hover:bg-green-500/10' 
                : 'bg-blue-600 text-white hover:bg-blue-500 border border-blue-500'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hostedUrl ? (
              <Check className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            {hostedUrl ? 'Updated' : 'Publish'}
          </button>
          
          {hostedUrl && (
            <button 
              onClick={handleDelete}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors ml-1"
              title="Delete Site"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Editor Pane */}
        <div className="w-1/2 flex flex-col border-r border-[#2A2A2A] bg-[#0F0F0F]">
          {/* Editor Tabs */}
          <div className="flex items-center border-b border-[#2A2A2A] bg-[#111111]">
            <div className="flex items-center px-4 py-2 border-r border-[#2A2A2A] text-xs text-slate-500 font-mono">
              <span className="text-slate-400 mr-2">{'</>'}</span>
            </div>
            <div className="px-4 py-2 text-xs font-mono text-blue-400 border-b-2 border-blue-500 bg-[#0F0F0F]">
              index.html
            </div>
            <div className="px-3 py-2 text-slate-500 hover:text-slate-300 cursor-pointer">
              +
            </div>
            <div className="flex-1" />
            <div className="px-4 text-xs font-mono text-slate-600">
              {lineCount} lines · utf-8 · html
            </div>
          </div>
          
          {/* Editor Body with Line Numbers */}
          <div className="flex-1 flex relative overflow-hidden bg-[#0F0F0F]">
            {/* Line Numbers Column */}
            <div className="w-12 flex-shrink-0 bg-[#0A0A0A] border-r border-[#1A1A1A] py-4 text-right pr-3 select-none overflow-hidden text-[13px] font-mono leading-relaxed text-slate-600">
              {Array.from({ length: Math.max(lineCount, 50) }).map((_, i) => (
                <div key={i} className={i < lineCount ? 'text-slate-600' : 'text-slate-800'}>
                  {i + 1}
                </div>
              ))}
            </div>
            
            {/* Textarea Code Editor */}
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full h-full p-4 bg-transparent text-[#D4D4D4] resize-none focus:outline-none focus:ring-0 text-[13px] font-mono leading-relaxed whitespace-pre"
              placeholder="Paste HTML here..."
            />
          </div>
        </div>

        {/* Right Preview Pane */}
        <div className="w-1/2 flex flex-col bg-white transition-all relative">
          
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-[#FAFAFA] text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2 text-slate-600">
              <Eye className="w-4 h-4" />
              <span>live preview</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setDevicePreview('desktop')}
                  className={`hover:text-slate-900 transition-colors ${devicePreview === 'desktop' ? 'text-blue-600' : ''}`}
                >
                  desktop
                </button>
                <button 
                  onClick={() => setDevicePreview('tablet')}
                  className={`hover:text-slate-900 transition-colors ${devicePreview === 'tablet' ? 'text-blue-600' : ''}`}
                >
                  tablet
                </button>
                <button 
                  onClick={() => setDevicePreview('phone')}
                  className={`hover:text-slate-900 transition-colors ${devicePreview === 'phone' ? 'text-blue-600' : ''}`}
                >
                  phone
                </button>
              </div>
              <span className="text-slate-300">|</span>
              <button className="hover:text-slate-900 transition-colors">fullscreen</button>
              <button 
                onClick={() => hostedUrl && window.open(hostedUrl, '_blank')}
                className="hover:text-slate-900 transition-colors"
                title="Open Live URL"
              >
                ↗
              </button>
            </div>
          </div>
          
          {/* Iframe Container */}
          <div className="flex-1 flex items-center justify-center bg-slate-100 overflow-hidden relative">
            <iframe 
              ref={iframeRef}
              className={`bg-white border-none shadow-sm transition-all duration-300 ${
                devicePreview === 'desktop' ? 'w-full h-full' :
                devicePreview === 'tablet' ? 'w-[768px] h-[1024px] rounded-md shadow-xl' :
                'w-[375px] h-[812px] rounded-3xl shadow-2xl border-8 border-slate-900'
              }`}
              title="Live Preview"
            />
            
            {/* Success Modal */}
            {showSuccessModal && hostedUrl && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#111111] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 text-center relative">
                    <button 
                      onClick={() => setShowSuccessModal(false)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-blue-500" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">Congratulations!</h3>
                    <p className="text-slate-400 mb-6 text-sm">
                      Your InstantSite is live and ready to share with the world.
                    </p>
                    
                    <div className="flex items-center gap-2 bg-[#0a0a0a] border border-slate-800 rounded-lg p-1.5 mb-6">
                      <div className="flex-1 px-3 py-2 text-sm text-slate-300 font-mono truncate text-left select-all bg-transparent">
                        {hostedUrl}
                      </div>
                      <button 
                        onClick={copyLink}
                        className="p-2 hover:bg-[#1A1A1A] rounded-md text-slate-400 hover:text-white transition-colors flex-shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        Close
                      </button>
                      <button 
                        onClick={() => window.open(hostedUrl, '_blank')}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                      >
                        Visit Site <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
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
