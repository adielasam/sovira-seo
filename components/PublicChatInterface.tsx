'use client'

import { useState } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicChatInterface({ botId, name, themeColor, botAvatar }: { botId: string, name: string, themeColor: string, botAvatar?: string | null }) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const handleChat = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ chatbotId: botId, messages: newMessages })
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans sm:p-4 md:p-8 lg:p-12">
      <div className="flex-1 w-full max-w-4xl mx-auto bg-slate-100/50 dark:bg-slate-900/50 shadow-2xl sm:rounded-[2rem] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-slate-200 dark:border-slate-800 relative">
        
        {/* Decorative Background Blob */}
        <div className="absolute top-0 left-0 w-full h-64 opacity-10 pointer-events-none" style={{ background: `linear-gradient(180deg, ${themeColor}, transparent)` }} />

        {/* Header */}
        <header className="px-6 py-5 flex items-center gap-4 text-white shadow-sm z-10" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>
          {botAvatar ? (
            <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-white/30 shadow-md shrink-0 bg-white">
              <img src={botAvatar} alt="Bot Avatar" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center border-[3px] border-white/30 shadow-md shrink-0">
              <Bot className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-tight">{name}</h1>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/90 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse border border-green-200/50 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              Online and ready to help
            </div>
          </div>
        </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 w-full z-10 relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 animate-in fade-in duration-700">
            {botAvatar ? (
              <div className="w-20 h-20 rounded-full overflow-hidden opacity-40 grayscale border border-slate-300">
                <img src={botAvatar} className="w-full h-full object-cover" />
              </div>
            ) : (
              <Bot className="h-16 w-16 opacity-20" />
            )}
            <p className="font-medium text-slate-500">How can I help you today?</p>
          </div>
        ) : (
          messages.map((m, i) => {
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
                  <div className="flex gap-3 max-w-[90%] sm:max-w-[85%]">
                    <div className="shrink-0 mt-auto mb-1 w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      {botAvatar ? <img src={botAvatar} className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] text-slate-500 font-medium ml-1">{name}</span>
                      <div 
                        className="rounded-2xl rounded-bl-sm px-5 py-4 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap transition-colors"
                        style={{ backgroundColor: themeColor, color: textColor }}
                      >
                        {m.content || (chatLoading && i === messages.length - 1 ? (
                          <div className="flex items-center gap-1.5 h-6 px-1">
                            <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                            <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: textColor, opacity: 0.6 }}></span>
                          </div>
                        ) : '')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm px-5 py-3.5 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {m.content}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Input Area */}
      <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 relative">
        <div className="p-4 sm:p-6 pb-2">
          <form onSubmit={handleChat} className="flex gap-3">
            <input 
              placeholder="Type your message..." 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full text-[15px] focus:outline-none focus:ring-2 shadow-inner transition-shadow"
              style={{ '--tw-ring-color': themeColor } as any}
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || chatLoading} 
              className="w-14 h-14 flex items-center justify-center rounded-full text-white transition-all disabled:opacity-50 flex-shrink-0 shadow-lg hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <Send className="h-6 w-6 ml-1" />
            </button>
          </form>
          <div className="text-center mt-4">
            <a href="https://sovira.com.ng" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest">
              Powered by Sovira AI
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
