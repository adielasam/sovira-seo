'use client'

import { useState, useRef, useEffect, use } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RAGChatbotWidget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bot, setBot] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadBot() {
      const { data } = await supabase.from('chatbots').select('*').eq('id', id).single()
      if (data) {
        setBot(data)
        setMessages([{ role: 'assistant', content: `Hello! I'm ${data.name}. How can I help you today?` }])
        
        // Notify parent iframe about theme color so the toggle button can match
        if (typeof window !== 'undefined') {
          window.parent.postMessage({ type: 'SET_THEME', color: data.theme_color || '#2563eb' }, '*')
        }
      }
    }
    loadBot()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !bot) return

    const userMessage = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chatbots/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotId: id, messages: newMessages })
      })

      if (!res.ok) throw new Error('Query failed')
      
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
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!bot) return null

  const themeColor = bot.theme_color || '#2563eb'

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 m-0 overflow-hidden font-sans">
      
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-3 text-white shadow-sm shrink-0" 
        style={{ backgroundColor: themeColor }}
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-tight">{bot.name}</span>
          <span className="text-xs text-white/80">Active now</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                m.role === 'user' 
                  ? 'text-white' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700'
              }`}
              style={m.role === 'user' ? { backgroundColor: themeColor } : {}}
            >
              {m.content || (loading && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 text-sm text-slate-900 dark:text-white"
            style={{ '--tw-ring-color': themeColor } as any}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-transform active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">⚡ Powered by Sovira RAG</span>
        </div>
      </div>
      
    </div>
  )
}
