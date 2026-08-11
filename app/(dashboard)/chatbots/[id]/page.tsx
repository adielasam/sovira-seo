'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileUp, Save, Code, CheckCircle2, ArrowLeft, Loader2, Bot, Send } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ChatbotDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bot, setBot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  
  // Test Chat State
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

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
        theme_color: bot.theme_color
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

      if (!res.ok) throw new Error('Failed to query')

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
                      <li key={doc.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {doc.file_name}
                        </div>
                        <span className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</span>
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
            <div className="p-4 flex items-center gap-2 text-white" style={{ backgroundColor: bot.theme_color || '#2563eb' }}>
              <Bot className="h-5 w-5" />
              <h2 className="font-semibold text-lg">{bot.name} (Test)</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 flex-col gap-2">
                  <Bot className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Send a message to test your knowledgebase.</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap shadow-sm ${m.role === 'user' ? 'text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      style={m.role === 'user' ? { backgroundColor: bot.theme_color || '#2563eb' } : {}}
                    >
                      {m.content || (chatLoading && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : '')}
                    </div>
                  </div>
                ))
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
