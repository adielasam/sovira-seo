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
        className="p-4 flex items-center gap-3 text-white shadow-sm shrink-0 relative" 
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
      >
        {bot.bot_avatar ? (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shadow-md shrink-0 bg-white">
            <img src={bot.bot_avatar} alt="Bot Avatar" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 shadow-md shrink-0">
            <Bot className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-semibold text-[15px] leading-tight tracking-tight">{bot.name}</span>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse border border-green-200/50 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
            Online
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 1 && messages[0].role === 'assistant' && bot.bot_avatar && (
          <div className="flex justify-center mb-6 mt-4">
             <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <img src={bot.bot_avatar} className="w-full h-full object-cover" />
             </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          
          // Calculate contrast color for text if themeColor is used
          const hex = themeColor.replace('#', '');
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
                    <span className="text-[11px] text-slate-500 font-medium ml-1">{bot.name}</span>
                    <div 
                      className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm transition-colors"
                      style={{ backgroundColor: themeColor, color: textColor }}
                    >
                      {m.content || (loading && i === messages.length - 1 ? (
                          <div className="flex items-center gap-1 h-5 px-1">
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                          </div>
                      ) : '')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {m.content}
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Message..."
            className="flex-1 px-4 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 shadow-inner text-[14px] text-slate-900 dark:text-white transition-shadow"
            style={{ '--tw-ring-color': themeColor } as any}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all shadow-md hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">⚡ Powered by Sovira RAG</span>
        </div>
      </div>
      
    </div>
  )
}
