'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Upload, Code, Copy, Check, ExternalLink, Loader2, FolderArchive, FileCode2 } from 'lucide-react'
import JSZip from 'jszip'

export default function HtmlHostPage() {
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head>
  <title>My Site</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; }
    h1 { color: #f97316; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Start typing HTML or drop a file/ZIP anywhere to upload.</p>
</body>
</html>`)
  
  const [isUploading, setIsUploading] = useState(false)
  const [hostedUrl, setHostedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [filesPreview, setFilesPreview] = useState<{path: string, type: string}[]>([])

  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Live preview update
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent])

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
    
    const file = e.dataTransfer.files[0]
    if (!file) return

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
          // If there's an index.html, preview it
          const indexFile = extractedFiles.find(f => f.path.toLowerCase() === 'index.html') || extractedFiles.find(f => f.path.endsWith('.html'))
          if (indexFile) {
            setHtmlContent(indexFile.content)
          }
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
        await uploadFiles([{ path: 'index.html', content: text, type: 'text/html' }])
      }
      reader.readAsText(file)
    } else {
      alert('Please drop an HTML file or a ZIP file.')
    }
  }

  const handleDeploy = async () => {
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

  return (
    <div 
      className="flex flex-col h-[calc(100vh-4rem)] bg-[#0A0A0A] text-zinc-300 font-mono relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={processDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-orange-500/10 backdrop-blur-sm border-4 border-dashed border-orange-500/50 rounded-xl m-4 flex flex-col items-center justify-center">
          <FolderArchive className="w-20 h-20 text-orange-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-2">Drop to Deploy</h2>
          <p className="text-orange-200">ZIP folders or single HTML files</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0F0F0F]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#CBFF00] flex items-center justify-center text-black font-bold">
            h/
          </div>
          <span className="font-semibold text-white">htmlhost.co clone</span>
        </div>
        
        <div className="flex items-center gap-4">
          {hostedUrl && (
            <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          )}
          <button 
            onClick={handleDeploy}
            disabled={isUploading}
            className="flex items-center gap-2 bg-[#CBFF00] hover:bg-[#b3e600] text-black px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Start hosting
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {hostedUrl && (
        <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-zinc-400">Site deployed instantly to:</span>
            <a href={hostedUrl} target="_blank" rel="noreferrer" className="text-white hover:underline font-medium">
              {hostedUrl}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white" title="Copy Link">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <a href={hostedUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white" title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        <div className="w-1/2 flex flex-col border-r border-zinc-800 bg-[#0A0A0A]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#0F0F0F] text-xs text-zinc-500">
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
              className="absolute inset-0 w-full h-full p-4 bg-transparent text-zinc-300 resize-none focus:outline-none focus:ring-0 leading-relaxed font-mono text-sm"
              placeholder="Paste HTML here..."
            />
          </div>
        </div>

        {/* Preview Pane */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Live Preview</span>
            </div>
            
            {filesPreview.length > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
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
