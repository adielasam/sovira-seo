'use client'

import { useState } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicChatInterface({ botId, name, themeColor }: { botId: string, name: string, themeColor: string }) {
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
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-3 text-white shadow-md z-10" style={{ backgroundColor: themeColor }}>
        <Bot className="h-6 w-6" />
        <h1 className="font-semibold text-lg">{name}</h1>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <Bot className="h-12 w-12 opacity-20" />
            <p>How can I help you today?</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'}`}
                style={m.role === 'user' ? { backgroundColor: themeColor } : {}}
              >
                {m.content || (chatLoading && i === messages.length - 1 ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : '')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto w-full">
          <form onSubmit={handleChat} className="flex gap-2">
            <input 
              placeholder="Type your message..." 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full text-[15px] focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': themeColor } as any}
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || chatLoading} 
              className="w-12 h-12 flex items-center justify-center rounded-full text-white transition-opacity disabled:opacity-50 flex-shrink-0 shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <Send className="h-5 w-5 ml-1" />
            </button>
          </form>
          <div className="text-center mt-3">
            <a href="https://sovira.com.ng" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Powered by Sovira AI
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
