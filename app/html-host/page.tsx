'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Play, Upload, Code, Copy, Check, ExternalLink, Loader2, FolderArchive, FileCode2, Globe, Command, Trash2, Eye, Monitor, Smartphone, Tablet, Maximize2, X } from 'lucide-react'
import JSZip from 'jszip'
import confetti from 'canvas-confetti'
import Link from 'next/link'

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
  
  const [customSlug, setCustomSlug] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Live preview update
  useEffect(() => {
    if (mode === 'editor' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        let finalContent = htmlContent
        if (hostedUrl) {
           const baseUrl = hostedUrl.endsWith('/') ? hostedUrl : `${hostedUrl}/`
           const baseTag = `<base href="${baseUrl}">`
           if (finalContent.match(/<head[^>]*>/i)) {
             finalContent = finalContent.replace(/(<head[^>]*>)/i, `$1\n  ${baseTag}`)
           } else if (finalContent.match(/<html[^>]*>/i)) {
             finalContent = finalContent.replace(/(<html[^>]*>)/i, `$1\n<head>\n  ${baseTag}\n</head>`)
           } else {
             finalContent = `${baseTag}\n${finalContent}`
           }
        }
        
        doc.open()
        doc.write(finalContent)
        doc.close()
      }
    }
  }, [htmlContent, mode, devicePreview, hostedUrl])

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

  // Update custom slug when hosted URL changes
  useEffect(() => {
    if (hostedUrl) {
      const parts = hostedUrl.split('/site/')
      if (parts[1]) {
        setCustomSlug(parts[1].replace(/\//g, ''))
      }
    }
  }, [hostedUrl])

  const handleRename = async () => {
    if (!hostedUrl || !customSlug) return
    const oldSlug = hostedUrl.split('/site/')[1]?.replace(/\//g, '')
    if (oldSlug === customSlug) return
    
    setIsRenaming(true)
    try {
      const res = await fetch('/api/html-host/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldSlug, newSlug: customSlug })
      })
      const data = await res.json()
      if (res.ok) {
        setHostedUrl(data.url)
        alert('URL updated successfully!')
      } else {
        alert(data.error || 'Failed to rename URL')
        setCustomSlug(oldSlug) // revert
      }
    } catch (err) {
      console.error(err)
      alert('Failed due to network error')
    } finally {
      setIsRenaming(false)
    }
  }

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
        
        const filePaths = Object.keys(contents.files).filter(p => {
          const isDir = contents.files[p].dir
          const isJunk = p.includes('__MACOSX') || p.includes('.DS_Store')
          return !isDir && !isJunk
        })
        
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
          if (!zipEntry.dir && !path.includes('__MACOSX') && !path.includes('.DS_Store')) {
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
          body: JSON.stringify({ files: [file], slug: currentSlug, projectTitle: getProjectTitle() })
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
        className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={processDrop}
      >
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="absolute top-6 left-6 z-20">
          <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors text-sm font-medium bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-md border border-slate-200 dark:border-slate-800">
            <span>←</span> Back to Sovira
          </Link>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          className="hidden" 
          accept=".html,.zip,application/zip,application/x-zip-compressed"
        />

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-4 border-dashed border-blue-500 m-4 rounded-3xl flex flex-col items-center justify-center transition-all">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl shadow-blue-500/20">
              <FolderArchive className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Drop to Deploy</h2>
            <p className="text-blue-600 dark:text-blue-400 text-lg font-medium">ZIP folders or HTML files</p>
          </div>
        )}

        <div className="flex flex-col items-center max-w-2xl w-full px-6 text-center z-10">
          {/* Top Icon Box */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-3xl bg-white dark:bg-[#131B2C] shadow-2xl shadow-blue-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-10 cursor-pointer hover:border-blue-500 hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
            Host your InstantSite
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl mb-12 flex items-center justify-center gap-2 max-w-lg leading-relaxed">
            Paste HTML, drop a file, or upload a ZIP. <br className="hidden sm:block" /> Press <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-mono flex items-center gap-1 shadow-sm text-slate-700 dark:text-slate-300 mx-1 inline-flex"><Command className="w-3.5 h-3.5"/>V</kbd> anywhere to start.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12 w-full">
            <button 
              onClick={() => {
                setHtmlContent(`<!DOCTYPE html>\n<html>\n<head>\n  <title>My Site</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 2rem; }\n    h1 { color: #2563eb; }\n  </style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Start typing HTML here...</p>\n</body>\n</html>`)
                setMode('editor')
              }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white dark:bg-[#111] shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-slate-600 hover:shadow-blue-500/10 transition-all duration-300 group"
            >
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                <Code className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 pr-2">Paste HTML</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 border border-blue-500 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                <FolderArchive className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold pr-2">Upload folder</span>
            </button>
            <button 
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
            >
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Globe className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex flex-col items-start leading-tight pr-2">
                <span className="font-semibold text-slate-500">Clone URL</span>
                <span className="text-[10px] font-bold text-blue-500 tracking-wider">PRO FEATURE</span>
              </div>
            </button>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium tracking-wide">
              No signup required
            </p>
          </div>
        </div>
      </div>
    )
  }

  // EDITOR MODE
  return (
    <div 
      className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-300 font-sans relative overflow-hidden transition-colors duration-300"
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

      {/* Header - Adaptive IDE Style */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md z-10">
        
        {/* Left: Back & Project Info */}
        <div className="flex items-center gap-6 flex-1">
          <button 
            onClick={() => setMode('landing')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white text-sm font-semibold transition-colors bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg"
          >
            ← Back
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 border border-slate-200 dark:border-slate-700/50 rounded px-1.5 py-0.5 font-mono shadow-sm">
              PROJECT
            </span>
            <input 
              value={getProjectTitle()}
              onChange={handleTitleChange}
              title="Edit project name"
              placeholder="Enter site name..."
              className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-[#1A1A1A] border border-transparent hover:border-slate-300 dark:hover:border-slate-700/50 rounded-lg px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[200px] truncate transition-all shadow-sm"
            />
            {hostedUrl && (
              <div className="flex items-center gap-3">
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-500 text-xs hidden lg:inline font-mono">https://</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
                  <input 
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-transparent border-none focus:outline-none focus:ring-0 max-w-[140px] p-0"
                    placeholder="custom-url"
                  />
                  <span className="text-slate-500 text-xs font-mono">.sovira.com.ng</span>
                  {customSlug !== hostedUrl.split('https://')[1]?.split('.')[0] && (
                    <button 
                      onClick={handleRename}
                      disabled={isRenaming || !customSlug}
                      className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ml-2 shadow-sm"
                    >
                      {isRenaming ? '...' : 'Save'}
                    </button>
                  )}
                </div>
                <a href={hostedUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors ml-1 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md" title="Open site in new tab">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePublish}
            disabled={isUploading}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 ${
              hostedUrl 
                ? 'bg-emerald-50 dark:bg-[#1A1A1A] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/10' 
                : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500 shadow-blue-600/20'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hostedUrl ? (
              <Check className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            {hostedUrl ? 'Updated successfully' : 'Publish to World'}
          </button>
          
          {hostedUrl && (
            <button 
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-all ml-1 border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
              title="Delete Site"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Editor Pane */}
        <div className="w-1/2 flex flex-col border-r border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0F0F0F] z-10 shadow-xl">
          {/* Editor Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-[#2A2A2A] bg-slate-50 dark:bg-[#111111]">
            <div className="flex items-center px-4 py-3 border-r border-slate-200 dark:border-[#2A2A2A] text-xs text-slate-400 font-mono">
              <span className="text-slate-400 dark:text-slate-500 mr-2">{'</>'}</span>
            </div>
            <div className="px-6 py-3 text-sm font-semibold font-mono text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-[#0F0F0F]">
              index.html
            </div>
            <div className="px-4 py-3 text-slate-400 hover:text-blue-600 dark:hover:text-slate-300 cursor-pointer font-bold">
              +
            </div>
            <div className="flex-1" />
            <div className="px-4 text-xs font-mono font-medium text-slate-500 dark:text-slate-600">
              {lineCount} lines · utf-8 · html
            </div>
          </div>
          
          {/* Editor Body with Line Numbers */}
          <div className="flex-1 flex relative overflow-hidden bg-white dark:bg-[#0F0F0F]">
            {/* Line Numbers Column */}
            <div className="w-14 flex-shrink-0 bg-slate-50 dark:bg-[#0A0A0A] border-r border-slate-100 dark:border-[#1A1A1A] py-6 text-right pr-4 select-none overflow-hidden text-[14px] font-mono leading-relaxed text-slate-400 dark:text-slate-600">
              {Array.from({ length: Math.max(lineCount, 50) }).map((_, i) => (
                <div key={i} className={i < lineCount ? 'text-slate-400 dark:text-slate-500' : 'text-slate-200 dark:text-slate-800'}>
                  {i + 1}
                </div>
              ))}
            </div>
            
            {/* Textarea Code Editor */}
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full h-full p-6 bg-transparent text-slate-800 dark:text-[#D4D4D4] resize-none focus:outline-none focus:ring-0 text-[14px] font-mono leading-relaxed whitespace-pre"
              placeholder="Paste HTML here..."
            />
          </div>
        </div>

        {/* Right Preview Pane */}
        <div className="w-1/2 flex flex-col bg-slate-100 dark:bg-[#0A0A0A] transition-all relative">
          
          {/* Preview Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#111111] text-xs font-mono text-slate-500 shadow-sm z-10">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold tracking-wide uppercase">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>Live Preview</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-lg">
                <button 
                  onClick={() => setDevicePreview('desktop')}
                  className={`px-3 py-1.5 rounded-md transition-all font-semibold ${devicePreview === 'desktop' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Desktop
                </button>
                <button 
                  onClick={() => setDevicePreview('tablet')}
                  className={`px-3 py-1.5 rounded-md transition-all font-semibold ${devicePreview === 'tablet' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Tablet
                </button>
                <button 
                  onClick={() => setDevicePreview('phone')}
                  className={`px-3 py-1.5 rounded-md transition-all font-semibold ${devicePreview === 'phone' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Phone
                </button>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button 
                onClick={() => hostedUrl && window.open(hostedUrl, '_blank')}
                className="hover:text-blue-600 dark:hover:text-white transition-colors bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-slate-700 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                title="Open Live URL"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Iframe Container */}
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-[#0A0A0A] overflow-hidden relative p-8">
            <iframe 
              ref={iframeRef}
              className={`bg-white border-none transition-all duration-500 ease-out ${
                devicePreview === 'desktop' ? 'w-full h-full shadow-sm rounded-lg border border-slate-200 dark:border-slate-800' :
                devicePreview === 'tablet' ? 'w-[768px] h-[1024px] rounded-2xl shadow-2xl border-[12px] border-slate-800 dark:border-[#1A1A1A]' :
                'w-[375px] h-[812px] rounded-[3rem] shadow-2xl border-[14px] border-slate-800 dark:border-[#1A1A1A]'
              }`}
              title="Live Preview"
            />
            
            {/* Success Modal */}
            {showSuccessModal && hostedUrl && (
              <div className="absolute inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-8 text-center relative">
                    <button 
                      onClick={() => setShowSuccessModal(false)}
                      className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-[#1A1A1A] p-2 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Congratulations!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-base">
                      Your InstantSite is live and ready to share with the world.
                    </p>
                    
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-slate-800 rounded-xl p-2 mb-8 shadow-inner">
                      <div className="flex-1 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 font-mono font-bold truncate text-left select-all bg-transparent">
                        {hostedUrl}
                      </div>
                      <button 
                        onClick={copyLink}
                        className="p-3 bg-white dark:bg-[#1A1A1A] shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:border-blue-500 transition-all flex-shrink-0"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#1A1A1A] dark:hover:bg-slate-800 transition-colors"
                      >
                        Close
                      </button>
                      <button 
                        onClick={() => window.open(hostedUrl, '_blank')}
                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
