'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Upload, Code, Copy, Check, ExternalLink, Loader2, FolderArchive, FileCode2, Globe, Command, Trash2 } from 'lucide-react'
import JSZip from 'jszip'

export default function HtmlHostPage() {
  const [mode, setMode] = useState<'landing' | 'editor'>('landing')
  const [htmlContent, setHtmlContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [hostedUrl, setHostedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [filesPreview, setFilesPreview] = useState<{path: string, type: string}[]>([])

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
  }, [htmlContent, mode])

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
    if (filename.endsWith('.html')) return 'text/html'
    if (filename.endsWith('.css')) return 'text/css'
    if (filename.endsWith('.js')) return 'application/javascript'
    if (filename.endsWith('.json')) return 'application/json'
    if (filename.endsWith('.svg')) return 'image/svg+xml'
    return 'text/plain'
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
    if (file.name.endsWith('.zip')) {
      // Process ZIP
      try {
        const zip = new JSZip()
        const contents = await zip.loadAsync(file)
        
        const extractedFiles: {path: string, content: string, type: string}[] = []
        
        for (const [path, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir) {
            const content = await zipEntry.async('string')
            extractedFiles.push({
              path: path,
              content,
              type: getMimeType(path)
            })
          }
        }
        
        if (extractedFiles.length > 0) {
          setFilesPreview(extractedFiles.map(f => ({ path: f.path, type: f.type })))
          const indexFile = extractedFiles.find(f => f.path.toLowerCase() === 'index.html') || extractedFiles.find(f => f.path.endsWith('.html'))
          if (indexFile) {
            setHtmlContent(indexFile.content)
          }
          setMode('editor')
          await uploadFiles(extractedFiles)
        }
      } catch (err) {
        console.error('ZIP extraction failed', err)
        alert('Failed to read ZIP file. Make sure it contains text/HTML files.')
      }
    } else if (file.name.endsWith('.html') || file.type === 'text/html') {
      // Process Single HTML
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        setHtmlContent(text)
        setMode('editor')
        await uploadFiles([{ path: 'index.html', content: text, type: 'text/html' }])
      }
      reader.readAsText(file)
    } else {
      alert('Please drop an HTML file or a ZIP file.')
    }
  }

  const handlePublish = async () => {
    await uploadFiles([{ path: 'index.html', content: htmlContent, type: 'text/html' }])
  }

  const uploadFiles = async (files: {path: string, content: string, type: string}[]) => {
    setIsUploading(true)
    setHostedUrl('')
    try {
      const res = await fetch('/api/html-host/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      })
      
      const data = await res.json()
      if (res.ok) {
        setHostedUrl(data.url)
      } else {
        alert(data.error || 'Upload failed')
      }
    } catch (err) {
      console.error(err)
      alert('Upload failed due to network error')
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
          accept=".html,.zip"
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
      className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0F19] text-slate-300 font-mono relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={processDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept=".html,.zip"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#131B2C]">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('landing')}
            className="text-slate-400 hover:text-white mr-2"
          >
            ← Back
          </button>
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
            i/
          </div>
          <span className="font-semibold text-white tracking-wide">InstantSite</span>
        </div>
        
        <div className="flex items-center gap-4">
          {hostedUrl && (
            <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-sm font-sans">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          )}
          <button 
            onClick={handlePublish}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50 font-sans shadow-lg shadow-blue-900/20"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {hostedUrl && (
        <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between font-sans">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-slate-300">Site deployed instantly to:</span>
            <a href={hostedUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-medium">
              {hostedUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white" title="Copy Link">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <a href={hostedUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white" title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={handleDelete} className="p-2 hover:bg-red-500/10 rounded-md transition-colors text-slate-400 hover:text-red-500" title="Delete Site">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        <div className="w-1/2 flex flex-col border-r border-slate-800 bg-[#0B0F19]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#131B2C] text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span>index.html</span>
            </div>
            <span>utf-8 html</span>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-4 bg-transparent text-slate-300 resize-none focus:outline-none focus:ring-0 leading-relaxed font-mono text-sm"
              placeholder="Paste HTML here..."
            />
          </div>
        </div>

        {/* Preview Pane */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Live Preview</span>
            </div>
            
            {filesPreview.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <FileCode2 className="w-4 h-4" />
                <span>{filesPreview.length} files loaded from ZIP</span>
              </div>
            )}
          </div>
          <iframe 
            ref={iframeRef}
            className="flex-1 w-full border-none"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  )
}
