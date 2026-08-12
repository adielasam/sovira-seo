'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileUp, Save, Code, CheckCircle2, ArrowLeft, Loader2, Bot, Send, Trash2, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ChatbotDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  
  // Test Chat State
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [avatarTab, setAvatarTab] = useState<'preset' | 'upload'>('preset')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  const PRESET_AVATARS = Array.from({length: 8}).map((_, i) => `/avatars/preset_${i+1}.jpg`)

  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBot()
    fetchDocuments()
  }, [id])

  const fetchBot = async () => {
    const { data } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setBot(data)
    setLoading(false)
  }

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('chatbot_documents')
      .select('*')
      .eq('chatbot_id', id)
      .order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('chatbots')
      .update({
        name: bot.name,
        system_prompt: bot.system_prompt,
        webhook_url: bot.webhook_url,
        theme_color: bot.theme_color,
        bot_avatar: bot.bot_avatar
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Settings saved!')
    }
    setSaving(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chatbotId', id)

    try {
      const res = await fetch('/api/chatbots/train', {
        method: 'POST',
        body: formData
      })
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      } else {
        const text = await res.text()
        throw new Error(`Server returned a non-JSON response (${res.status} ${res.statusText}). It might be a Vercel Payload Limit (4.5MB) or Timeout.`)
      }

      if (res.ok) {
        toast.success(`Processed ${data.chunksProcessed} data chunks.`)
        fetchDocuments()
      } else {
        toast.error(data.error || 'Failed to train bot')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
      
      if (uploadError) {
        // Fallback: If bucket doesn't exist or RLS blocks it, try to use the bot_avatar as a direct base64 string
        // Warning: This is a hacky fallback, ideally Supabase storage should be configured
        const reader = new FileReader()
        reader.onloadend = () => {
          setBot({...bot, bot_avatar: reader.result as string})
          toast.success('Avatar updated (saved as data URI due to storage limits)')
          setUploadingAvatar(false)
        }
        reader.readAsDataURL(file)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setBot({...bot, bot_avatar: publicUrl})
      toast.success('Avatar uploaded successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      setUploadingAvatar(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document and all its AI knowledge?')) return
    
    setDeletingDocId(docId)
    try {
      const res = await fetch('/api/chatbots/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, chatbotId: id })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Document deleted successfully')
        fetchDocuments()
      } else {
        throw new Error(data.error || 'Failed to delete document')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleTestChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const newMessages = [...messages, { role: 'user', content: chatInput }]
    setMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/chatbots/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotId: id, messages: newMessages })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to query: ${errorText}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              assistantMsg += JSON.parse(line.substring(2))
              setMessages([...newMessages, { role: 'assistant', content: assistantMsg }])
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
  if (!bot) return <div className="p-12 text-center text-red-500">Chatbot not found.</div>

  const embedCode = `<script src="https://sovira.com.ng/bots/widget.js" data-bot-id="${id}"></script>`

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/chatbots" className="p-2 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{bot.name}</h1>
          <p className="text-slate-500 mt-1">Manage knowledgebase, webhooks, and settings.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Settings & Knowledgebase */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-lg">Knowledge Base</h2>
              <p className="text-sm text-slate-500">Upload PDFs to train your AI agent.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="max-w-sm block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled={uploading} />
                <button 
                  disabled={uploading} 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                  Train from PDF
                </button>
              </div>

              {documents.length > 0 && (
                <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 font-medium text-sm text-slate-700 dark:text-slate-300">Trained Documents</div>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {documents.map(doc => (
                      <li key={doc.id} className="px-4 py-3 flex items-center justify-between text-sm group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Document"
                          >
                            {deletingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-lg">Configuration</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bot Name</label>
                <input 
                  value={bot.name} 
                  onChange={(e) => setBot({...bot, name: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Bot Avatar Section */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium">Bot Avatar</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button 
                      className={`flex-1 py-2 text-xs font-semibold ${avatarTab === 'preset' ? 'bg-white dark:bg-slate-800 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      onClick={() => setAvatarTab('preset')}
                    >
                      Choose Preset
                    </button>
                    <button 
                      className={`flex-1 py-2 text-xs font-semibold ${avatarTab === 'upload' ? 'bg-white dark:bg-slate-800 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      onClick={() => setAvatarTab('upload')}
                    >
                      Upload Custom
                    </button>
                  </div>
                  <div className="p-4">
                    {avatarTab === 'preset' ? (
                      <div className="grid grid-cols-4 gap-3">
                        {PRESET_AVATARS.map((src, i) => (
                          <div 
                            key={i}
                            onClick={() => setBot({...bot, bot_avatar: src})}
                            className={`aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${bot.bot_avatar === src ? 'border-blue-600 shadow-md ring-2 ring-blue-600/20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                          >
                            <img src={src} alt={`Preset ${i+1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center">
                          {bot.bot_avatar && bot.bot_avatar.startsWith('data:') || bot.bot_avatar?.includes('supabase') ? (
                            <img src={bot.bot_avatar} alt="Custom" className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlus className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            ref={avatarInputRef} 
                            onChange={handleAvatarUpload} 
                            className="hidden" 
                          />
                          <button 
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="text-sm px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center"
                          >
                            {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                            {uploadingAvatar ? 'Uploading...' : 'Choose Image'}
                          </button>
                          <p className="text-xs text-slate-500 mt-2">Recommended: Square image, max 2MB. Will be cropped to a circle.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">System Prompt (Personality & Rules)</label>
                <textarea 
                  rows={4} 
                  value={bot.system_prompt || ''} 
                  onChange={(e) => setBot({...bot, system_prompt: e.target.value})}
                  placeholder="You are a helpful customer support agent..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Automation Webhook URL (Make.com / n8n)</label>
                <input 
                  value={bot.webhook_url || ''} 
                  onChange={(e) => setBot({...bot, webhook_url: e.target.value})}
                  placeholder="https://hook.us1.make.com/..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm"
                />
                <p className="text-xs text-slate-500">Fired when the bot captures a user's email address during a chat.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme Color</label>
                <div className="flex gap-2">
                  <input type="color" className="w-16 h-10 p-1 cursor-pointer" value={bot.theme_color || '#2563eb'} onChange={(e) => setBot({...bot, theme_color: e.target.value})} />
                  <input 
                    value={bot.theme_color || '#2563eb'} 
                    onChange={(e) => setBot({...bot, theme_color: e.target.value})} 
                    className="w-32 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm uppercase"
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveSettings} 
                disabled={saving} 
                className="mt-4 flex items-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Configuration
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-lg">Public Share Link</h2>
              <p className="text-sm text-slate-500">Share this link with your students or clients so they can test the chatbot without needing a website.</p>
            </div>
            <div className="p-6">
              <div className="flex gap-2">
                <input 
                  readOnly
                  value={`https://sovira.com.ng/b/${id}`}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm focus:outline-none"
                />
                <button 
                  className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://sovira.com.ng/b/${id}`)
                    toast.success('Link copied to clipboard!')
                  }}
                >
                  <Code className="h-4 w-4 mr-2" /> Copy Link
                </button>
                <a 
                  href={`/b/${id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Open Link
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-lg">Embed Widget</h2>
              <p className="text-sm text-slate-500">Copy this code and paste it into your website's HTML before the closing &lt;/body&gt; tag.</p>
            </div>
            <div className="p-6">
              <div className="relative">
                <pre className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto text-sm border border-slate-200 dark:border-slate-700">
                  <code>{embedCode}</code>
                </pre>
                <button 
                  className="absolute top-2 right-2 flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-md text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode)
                    toast.success('Copied to clipboard!')
                  }}
                >
                  <Code className="h-3 w-3 mr-1.5" /> Copy
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Test Chat */}
        <div>
          <div className="h-[600px] flex flex-col sticky top-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-4 flex items-center gap-3 text-white shadow-sm z-10 relative" style={{ backgroundColor: bot.theme_color || '#2563eb' }}>
              {bot.bot_avatar ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-sm shrink-0">
                  <img src={bot.bot_avatar} alt="Bot Avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg leading-tight">{bot.name} (Test)</h2>
                <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse border border-green-200/50" />
                  Online
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 flex-col gap-2">
                  <Bot className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Send a message to test your knowledgebase.</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isUser = m.role === 'user';
                  
                  // Calculate contrast color for text if themeColor is used
                  const hex = (bot.theme_color || '#2563eb').replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16) || 0;
                  const g = parseInt(hex.substr(2, 2), 16) || 0;
                  const b = parseInt(hex.substr(4, 2), 16) || 0;
                  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                  const textColor = yiq >= 128 ? '#0f172a' : '#ffffff';

                  return (
                    <div key={i} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      {!isUser ? (
                        <div className="flex gap-2 max-w-[90%]">
                          <div className="shrink-0 mt-auto mb-1 w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                            {bot.bot_avatar ? <img src={bot.bot_avatar} className="w-full h-full object-cover" /> : <Bot className="w-4 h-4 text-slate-400" />}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 font-medium ml-1">{bot.name}</span>
                            <div 
                              className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap transition-colors"
                              style={{ backgroundColor: bot.theme_color || '#2563eb', color: textColor }}
                            >
                              {m.content || (chatLoading && i === messages.length - 1 ? (
                                <div className="flex items-center gap-1.5 h-5 px-1">
                                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                                </div>
                              ) : '')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                          {m.content}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <form onSubmit={handleTestChat} className="flex gap-2">
                <input 
                  placeholder="Ask a question..." 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 text-sm focus:outline-none focus:ring-1"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || chatLoading} 
                  className="w-10 h-10 flex items-center justify-center text-white rounded-md transition-colors disabled:opacity-50"
                  style={{ backgroundColor: bot.theme_color || '#2563eb' }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
