'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, MoreVertical, Mic, ArrowUp, Bot } from 'lucide-react'
import Link from 'next/link'

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: 'This is Sovira Agent! How can I assist you today?',
      }
    ],
    body: {
      pathname
    }
  })

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Optional: Auto open after 3 seconds for urgency
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 z-50 animate-bounce"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto w-auto md:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-[#0099FF] text-white p-4 flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-2">
              {/* Logo / Icon Placeholder */}
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-wide">Sovira Agent</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900/50">
            
            {/* Disclaimer text */}
            <div className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              By joining this chat, you confirm that you agree to and understand our{' '}
              <Link href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</Link> and{' '}
              <span className="text-blue-500 hover:underline cursor-pointer">Terms of Service</span>. 
              Please note that this AI-powered assistant may occasionally provide inaccurate information.
            </div>

            {/* Messages */}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                
                {/* Assistant Avatar for bot messages */}
                {m.role === 'assistant' && (
                  <div className="flex gap-2 items-end mb-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0 mb-5">
                      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-[280px]">
                      <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 dark:border-slate-700 text-sm whitespace-pre-wrap">
                        {m.content}
                      </div>
                      <span className="text-[10px] text-slate-400 pl-1 font-medium">Sovira Agent (Bot)</span>
                    </div>
                  </div>
                )}

                {/* User Message */}
                {m.role === 'user' && (
                  <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm shadow-sm text-sm max-w-[280px] whitespace-pre-wrap">
                    {m.content}
                  </div>
                )}
              </div>
            ))}
            
            {error && (
              <div className="text-red-500 text-sm text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                Error: Failed to connect to Sovira Agent. Please try again.
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <button type="button" className="absolute left-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="absolute right-2 p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-700 disabled:opacity-50 disabled:hover:bg-slate-100 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  )
}
