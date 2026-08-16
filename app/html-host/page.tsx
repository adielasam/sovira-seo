'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Play, Upload, Code, Copy, Check, ExternalLink, Loader2, FolderArchive, FileCode2, Globe, Command, Trash2, Eye, Monitor, Smartphone, Tablet, Maximize2, X, Sparkles, Database, Image as ImageIcon, LayoutDashboard, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import JSZip from 'jszip'
import confetti from 'canvas-confetti'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  wordWrap: 'on' as const,
  formatOnPaste: true,
  formatOnType: true,
  autoClosingTags: true,
  autoClosingBrackets: 'always' as const,
  autoClosingQuotes: 'always' as const,
  autoIndent: 'full' as const,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'smart' as const,
  tabCompletion: 'on' as const,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  lineHeight: 1.6,
  padding: { top: 16 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
}

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <title>My dorvas</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Welcome to Dorvas Technologies!</h1>
  <a href="https://www.sovira.com.ng" class="btn">click me</a>
  <p>Start typing HTML here...</p>
</body>
</html>`;



export default function HtmlHostPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
      }
    })

    // Handle Edit Mode from URL
    const params = new URLSearchParams(window.location.search)
    const editSlug = params.get('edit')
    if (editSlug) {
      setCustomSlug(editSlug)
      setIsUploading(true) // Reuse upload spinner state for loading
      fetch(`/api/html-host/source?slug=${editSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.html) {
            setHtmlContent(data.html)
            setMode('editor')
            setHostedUrl(window.location.hostname.includes('localhost') ? `http://localhost:3000/${editSlug}/` : `https://${editSlug}.sovira.com.ng/`)
          } else {
            alert('Failed to load site source: ' + (data.error || 'Unknown error'))
          }
        })
        .catch(err => {
          console.error(err)
          alert('Error fetching site source')
        })
        .finally(() => setIsUploading(false))
    }

    // Restore pending html from unauthenticated session
    if (typeof window !== 'undefined') {
      const pendingHtml = localStorage.getItem('sovira_pending_html')
      if (pendingHtml) {
        setHtmlContent(pendingHtml)
        setMode('editor')
        localStorage.removeItem('sovira_pending_html')
      }
    }
  }, [])
  const [mode, setMode] = useState<'landing' | 'editor'>('landing')
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE)
  const [isUploading, setIsUploading] = useState(false)
  const [hostedUrl, setHostedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [filesPreview, setFilesPreview] = useState<{path: string, type: string}[]>([])
  
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'phone' | 'fullscreen'>('desktop')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  
  const [customSlug, setCustomSlug] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  // AI Edit States
  const [showAiPrompt, setShowAiPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiEditing, setIsAiEditing] = useState(false)

  // Media Manager States
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{url: string, name: string}[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Viral Watermark State
  const [showWatermarkModal, setShowWatermarkModal] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  
  // Live preview update
  useEffect(() => {
    if (mode === 'editor' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        let finalContent = htmlContent
        const activeSlug = extractSlug(hostedUrl) || customSlug || 'preview'
        const baseTag = `<base href="/${activeSlug}/">`
        if (finalContent.match(/<head[^>]*>/i)) {
          finalContent = finalContent.replace(/(<head[^>]*>)/i, `$1\n  ${baseTag}`)
        } else if (finalContent.match(/<html[^>]*>/i)) {
          finalContent = finalContent.replace(/(<html[^>]*>)/i, `$1\n<head>\n  ${baseTag}\n</head>`)
        } else {
          finalContent = `${baseTag}\n${finalContent}`
        }
        

        
        doc.open()
        doc.write(finalContent)
        doc.close()
      }
    }
  }, [htmlContent, mode, devicePreview, hostedUrl, customSlug])

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

  const extractSlug = (url: string) => {
    if (!url) return ''
    try {
      const u = new URL(url)
      // If it's a subdomain (e.g. dorvas.sovira.com.ng)
      if (u.hostname.endsWith('.sovira.com.ng') && !['www.sovira.com.ng', 'sovira.com.ng'].includes(u.hostname)) {
        return u.hostname.replace('.sovira.com.ng', '')
      }
      // If it's localhost or an old /site/ path
      if (u.pathname.startsWith('/site/')) {
        return u.pathname.split('/site/')[1]?.replace(/\//g, '')
      }
      // If it's localhost (e.g. localhost:3000/dorvas/)
      return u.pathname.split('/')[1]?.replace(/\//g, '')
    } catch(e) {
      if (url.includes('/site/')) return url.split('/site/')[1]?.replace(/\//g, '')
    }
    return ''
  }

  // Update custom slug when hosted URL changes
  useEffect(() => {
    if (hostedUrl) {
      const slug = extractSlug(hostedUrl)
      if (slug) setCustomSlug(slug)
    }
  }, [hostedUrl])

  // Save hotkey (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handlePublish()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [htmlContent, user])

  const handleRename = async () => {
    if (!hostedUrl || !customSlug) return
    const oldSlug = extractSlug(hostedUrl)
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
    await uploadFiles([{ path: 'index.html', content: htmlContent, type: 'text/html', isBinary: false }], false, true)
  }

  const handleSaveToProject = async () => {
    await uploadFiles([{ path: 'index.html', content: htmlContent, type: 'text/html', isBinary: false }], true, false)
  }

  const uploadFiles = async (files: {path: string, content: string, type: string, isBinary: boolean}[], requireLogin = false, isPublishing = true) => {
    if (requireLogin && !user) {
      setShowAuthModal(true)
      return
    }

    setIsUploading(true)
    setHostedUrl('')
    try {
      let currentSlug = ''
      let finalUrl = ''
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.path.toLowerCase() === 'index.html' || file.path.toLowerCase().endsWith('.html')) {
          
          // Inject Viral Watermark (if not already removed by the user)
          if (!file.content.includes('sovira-watermark') && !file.content.includes('sovira-watermark-removed')) {
            const watermarkHtml = `\n<!-- sovira-watermark --><a href="https://www.sovira.com.ng" target="_blank" style="position:fixed;bottom:20px;left:20px;background:#1e293b;color:#fff;padding:8px 12px;border-radius:6px;font-family:sans-serif;font-size:12px;font-weight:bold;z-index:999999;box-shadow:0 4px 6px rgba(0,0,0,0.1);display:flex;align-items:center;gap:6px;opacity:0.9;transition:opacity 0.2s;text-decoration:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>Powered by Sovira SEO</a>`;
            if (file.content.includes('</body>')) {
              file.content = file.content.replace('</body>', `${watermarkHtml}\n</body>`)
            } else {
              file.content += watermarkHtml;
            }
          }
        }
      }

      // Upload sequentially to avoid Next.js 4.5MB serverless payload limits
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await fetch('/api/html-host/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [file], slug: currentSlug, projectTitle: getProjectTitle(), userId: user?.id })
        })
        
        const data = await res.json()
        if (res.ok) {
          currentSlug = data.slug
          finalUrl = data.url
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      }
      
      if (isPublishing) {
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
      } else {
        alert('✅ Project saved successfully to your dashboard!')
      }
      
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message === 'Failed to fetch') {
        alert('Network Error (Failed to fetch): The server connection dropped. This usually happens if your internet disconnected, or if your project contains massive base64 images that exceeded the 4MB upload limit. Please use the Media Manager to upload large images instead of pasting them into the code.')
      } else {
        alert(err instanceof Error ? err.message : 'Upload failed due to network error')
      }
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
    const slug = extractSlug(hostedUrl)
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

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return
    setIsAiEditing(true)
    try {
      const res = await fetch('/api/html-host/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHtml: htmlContent, prompt: aiPrompt, slug: customSlug })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'AI Edit failed')
      }

      const data = await res.json()
      if (data.updatedHtml) {
        setHtmlContent(data.updatedHtml)
        setShowAiPrompt(false)
        setAiPrompt('')
      }
    } catch (err: any) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Failed to apply AI edit. Please try again.'
      if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')) {
        window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: msg } }))
      } else {
        toast.error(msg)
      }
    } finally {
      setIsAiEditing(false)
    }
  }

  const getProjectSize = () => {
    return (new Blob([htmlContent]).size / 1024).toFixed(1) + ' KB'
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setIsUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slug', customSlug)

      const res = await fetch('/api/html-host/upload-media', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('Media upload failed')
      }

      const data = await res.json()
      if (data.url) {
        setMediaFiles(prev => [{ url: data.url, name: file.name }, ...prev])
      }
    } catch (err) {
      console.error(err)
      alert('Failed to upload media.')
    } finally {
      setIsUploadingMedia(false)
      if (mediaInputRef.current) mediaInputRef.current.value = ''
    }
  }

  const copyImageTag = (url: string, name: string) => {
    const tag = `<img src="${url}" alt="${name.split('.')[0]}" />`
    navigator.clipboard.writeText(tag)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editor.onKeyUp((e: any) => {
      if (e.browserEvent.key === '>') {
        const position = editor.getPosition();
        const textUntilPosition = editor.getModel().getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        const match = textUntilPosition.match(/<([a-zA-Z0-9\-]+)[^<]*>$/);
        if (match) {
          const tag = match[1];
          const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
          const isClosing = textUntilPosition.match(/<\/([a-zA-Z0-9\-]+)[^<]*>$/);
          const isSelfClosing = textUntilPosition.match(/\/>$/);
          
          if (!selfClosingTags.includes(tag.toLowerCase()) && !isClosing && !isSelfClosing) {
            editor.executeEdits('auto-close-tag', [{
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              text: `</${tag}>`,
              forceMoveMarkers: true
            }]);
            editor.setPosition(position);
          }
        }
      }
    });
  };

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
                setHtmlContent(DEFAULT_TEMPLATE)
                setMode('editor')
              }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white dark:bg-[#111] shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-slate-600 hover:shadow-blue-500/10 transition-all duration-300 group"
            >
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                <Code className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 pr-2">Start with Template</span>
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
      className="flex flex-col h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-300 font-sans relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 transition-colors duration-300"
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
      <input 
        type="file" 
        ref={mediaInputRef} 
        onChange={handleMediaUpload} 
        className="hidden" 
        accept="image/*"
      />

      {/* Header - Adaptive IDE Style */}
      <div className="flex items-center px-2 sm:px-6 py-4 gap-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md z-10 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        
        {/* Left: Back & Project Info */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <button 
            onClick={() => setMode('landing')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white text-sm font-semibold transition-colors bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg"
          >
            ← Back
          </button>
          
          {user && (
            <a 
              href="/dashboard"
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white text-sm font-semibold transition-colors bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg"
              title="Go to Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </a>
          )}
          
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
        
        <div className="flex-1 min-w-[20px]" />
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* File Size Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A1A1A] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-medium shadow-sm">
            <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {getProjectSize()}
          </div>

          {/* Media Button */}
          <button 
            onClick={() => setShowMediaModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-white dark:bg-[#1A1A1A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          >
            <ImageIcon className="w-4 h-4" />
            Media
          </button>

          {/* AI Edit Button */}
          <button 
            onClick={() => setShowAiPrompt(!showAiPrompt)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            <Sparkles className="w-4 h-4" />
            AI Edit
          </button>
          
          {/* Remove Watermark Button */}
          {!htmlContent.includes('sovira-watermark-removed') && (
            <button 
              onClick={() => setShowWatermarkModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Remove Watermark
            </button>
          )}
          
          <button 
            onClick={handlePublish}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
              hostedUrl 
                ? 'bg-emerald-50 dark:bg-[#1A1A1A] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/10' 
                : 'bg-white dark:bg-[#1A1A1A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : hostedUrl ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {hostedUrl ? 'Update Published' : 'Publish'}
          </button>
          
          <button 
            onClick={handleSaveToProject}
            disabled={isUploading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 bg-blue-600 text-white hover:bg-blue-700 border border-blue-500 shadow-blue-600/20"
          >
            <FolderArchive className="w-4 h-4" />
            Save Project
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

      {/* Media Manager Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-slate-900 dark:white flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-blue-500" />
                Media Manager
              </h2>
              <button 
                onClick={() => setShowMediaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Upload Dropzone */}
              <div 
                onClick={() => mediaInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group mb-8"
              >
                {isUploadingMedia ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Uploading to cloud...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Click to upload an image
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded Files Gallery */}
              {mediaFiles.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Session Uploads</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mediaFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                          <button 
                            onClick={() => copyImageTag(file.url, file.name)}
                            className={`text-xs font-bold hover:underline flex items-center gap-1 mt-0.5 ${copiedUrl === file.url ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'}`}
                          >
                            {copiedUrl === file.url ? (
                              <>
                                <Check className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy HTML Tag
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No media uploaded in this session.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        
        {/* Floating AI Prompt Bar */}
        {showAiPrompt && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
              <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111]">
                <Sparkles className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="E.g., Make the buttons rounded and blue, or fix my typos..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-600"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAiEdit()
                    if (e.key === 'Escape') setShowAiPrompt(false)
                  }}
                  disabled={isAiEditing}
                />
                <button 
                  onClick={() => setShowAiPrompt(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#1A1A1A]">
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">POWERED BY SOVIRA AI</span>
                <button
                  onClick={handleAiEdit}
                  disabled={isAiEditing || !aiPrompt.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                >
                  {isAiEditing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    'Apply Changes'
                  )}
                </button>
              </div>
              {/* AI Processing Overlay */}
              {isAiEditing && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-bold animate-pulse">
                    <Sparkles className="w-4 h-4" />
                    Writing Code...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Left Editor Pane */}
        <div className="w-full md:w-[60%] flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0F0F0F] z-10 shadow-xl h-1/2 md:h-full min-h-0">
          {/* Editor Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-[#2A2A2A] bg-slate-50 dark:bg-[#111111]">
            <div className="flex items-center px-4 py-3 border-r border-slate-200 dark:border-[#2A2A2A] text-xs text-slate-400 font-mono">
              <span className="text-slate-400 dark:text-slate-500 mr-2">{'</>'}</span>
            </div>
            <div className="px-6 py-3 text-sm font-semibold font-mono text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-[#0F0F0F]">
              {htmlContent.includes('<?php') ? 'index.php' : 'index.html'}
            </div>
            <div className="px-4 py-3 text-slate-400 hover:text-blue-600 dark:hover:text-slate-300 cursor-pointer font-bold">
              +
            </div>
            <div className="flex-1" />
            <div className="px-4 text-xs font-mono font-medium text-slate-500 dark:text-slate-600">
              {lineCount} lines · utf-8 · {htmlContent.includes('<?php') ? 'php' : 'html'}
            </div>
          </div>
          
          {/* Editor Body */}
          <div className="flex-1 flex relative overflow-hidden bg-white dark:bg-[#0F0F0F] pt-2 min-h-0">
            <Editor
              height="100%"
              language={htmlContent.includes('<?php') ? 'php' : 'html'}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={htmlContent}
              onChange={(value) => setHtmlContent(value || '')}
              options={EDITOR_OPTIONS}
              onMount={handleEditorDidMount}
              loading={
                <div className="flex items-center justify-center w-full h-full text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading editor...
                </div>
              }
            />
          </div>
        </div>

        {/* Right Preview Pane */}
        <div className={`flex flex-col bg-slate-100 dark:bg-[#0A0A0A] transition-all relative h-1/2 md:h-full min-h-0 border-l border-slate-200 dark:border-[#2A2A2A] ${devicePreview === 'fullscreen' ? 'hidden' : 'w-full md:w-[40%]'}`}>
          
          {/* Preview Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#111111] text-xs font-mono text-slate-500 shadow-sm z-10">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold tracking-wide uppercase">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>Live Preview</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-2 sm:gap-4 bg-slate-100 dark:bg-[#1A1A1A] p-1 rounded-lg shrink-0">
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
              <button 
                onClick={() => {
                  const isPHP = htmlContent.includes('<?php')
                  const blob = new Blob([htmlContent], { type: isPHP ? 'application/x-httpd-php' : 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = isPHP ? 'index.php' : 'index.html';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Code downloaded successfully!');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-sm transition-all shrink-0"
                title="Download Code"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
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
          <div className="flex-1 flex items-start justify-center bg-slate-100 dark:bg-[#0A0A0A] overflow-y-auto overflow-x-hidden relative p-4 sm:p-8 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <iframe 
              ref={iframeRef}
              className={`bg-white border-none transition-all duration-500 ease-out shrink-0 ${
                devicePreview === 'desktop' ? 'w-full h-full shadow-sm rounded-lg border border-slate-200 dark:border-slate-800' :
                devicePreview === 'tablet' ? 'w-[768px] h-[1024px] rounded-xl shadow-2xl border-[8px] sm:border-[12px] border-slate-800 dark:border-[#1A1A1A]' :
                'w-[375px] h-[812px] rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-[10px] sm:border-[14px] border-slate-800 dark:border-[#1A1A1A]'
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
            
            {/* Auth Modal */}
            {showAuthModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAuthModal(false)} />
                <div className="relative bg-white dark:bg-[#111111] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                  <div className="p-8 text-center relative">
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-[#1A1A1A] p-2 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FolderArchive className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Save Your Project</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-base">
                      You must be logged in to save your codebase to the cloud. Create a free account to persist your progress!
                    </p>
                    
                    <div className="flex flex-col gap-4">
                      <button 
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('sovira_pending_html', htmlContent)
                          }
                          router.push('/auth/login?redirect=/html-host')
                        }}
                        className="w-full px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                      >
                        Log In
                      </button>
                      <button 
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('sovira_pending_html', htmlContent)
                          }
                          router.push('/auth/register?redirect=/html-host')
                        }}
                        className="w-full px-6 py-3 rounded-xl font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                      >
                        Create Free Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Remove Watermark Modal */}
            {showWatermarkModal && (
              <div className="absolute inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center relative p-8">
                  <button 
                    onClick={() => setShowWatermarkModal(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Trash2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Remove Watermark</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
                    Want to remove the "Powered by Sovira SEO" badge for free? Just share your site on X (Twitter) or WhatsApp!
                  </p>
                  <div className="flex flex-col gap-3">
                    <a 
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('I just built an awesome website in seconds using the AI Web Builder by @SoviraSEO! Check it out: ' + (hostedUrl || 'https://sovira.com.ng'))}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setTimeout(() => {
                          let newHtml = htmlContent.replace(/<!-- sovira-watermark -->.*?<\/a>/g, '');
                          if (newHtml.includes('<head>')) {
                            newHtml = newHtml.replace('<head>', '<head>\n  <meta name="sovira-watermark-removed" content="true">');
                          } else {
                            newHtml = '<meta name="sovira-watermark-removed" content="true">\n' + newHtml;
                          }
                          setHtmlContent(newHtml);
                          setShowWatermarkModal(false);
                          alert("Watermark removed! Make sure to click Publish to save changes.");
                        }, 2000);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.976H5.078z"></path></svg>
                      Share on X to Remove
                    </a>
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent('I just built an awesome website in seconds using the AI Web Builder by @SoviraSEO! Check it out: ' + (hostedUrl || 'https://sovira.com.ng'))}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setTimeout(() => {
                          let newHtml = htmlContent.replace(/<!-- sovira-watermark -->.*?<\/a>/g, '');
                          if (newHtml.includes('<head>')) {
                            newHtml = newHtml.replace('<head>', '<head>\n  <meta name="sovira-watermark-removed" content="true">');
                          } else {
                            newHtml = '<meta name="sovira-watermark-removed" content="true">\n' + newHtml;
                          }
                          setHtmlContent(newHtml);
                          setShowWatermarkModal(false);
                          alert("Watermark removed! Make sure to click Publish to save changes.");
                        }, 2000);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      Share on WhatsApp
                    </a>
                    <button 
                      onClick={() => setShowWatermarkModal(false)}
                      className="w-full py-3.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold mt-2"
                    >
                      Maybe Later
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
