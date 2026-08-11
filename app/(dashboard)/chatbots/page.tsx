'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bot, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createChatbotAction } from '@/app/actions/chatbots'

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchChatbots()
  }, [])

  const fetchChatbots = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setChatbots(data)
    }
    setLoading(false)
  }

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setCreating(true)
    
    const res = await createChatbotAction(newName)
    
    if (res.success && res.chatbotId) {
      toast.success('Chatbot created successfully!')
      router.push(`/chatbots/${res.chatbotId}`)
    } else {
      toast.error(res.error || 'Failed to create chatbot')
    }
    
    setCreating(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Knowledgebase Chatbots</h1>
        <p className="text-slate-500 mt-2">
          Create custom AI chatbots trained on your own PDF documents. Embed them anywhere and capture leads directly into Make.com or n8n.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900 h-fit">
          <h2 className="font-semibold text-lg mb-1">Create New Bot</h2>
          <p className="text-sm text-slate-500 mb-6">Train a new AI agent</p>
          <form onSubmit={handleCreateBot} className="space-y-4">
            <input
              type="text"
              placeholder="e.g. Customer Support Bot"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              required
              className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50" 
              disabled={creating || !newName.trim()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Chatbot
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : chatbots.length === 0 ? (
            <div className="text-center p-12 border rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Bot className="h-12 w-12 mx-auto text-slate-400 mb-4 opacity-50" />
              <h3 className="font-semibold text-slate-900 dark:text-white">No Chatbots Yet</h3>
              <p className="text-sm text-slate-500 mt-1">Create your first chatbot to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {chatbots.map(bot => (
                <div 
                  key={bot.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden" 
                  onClick={() => router.push(`/chatbots/${bot.id}`)}
                >
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: bot.theme_color || '#2563eb' }} />
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${bot.theme_color}15`, color: bot.theme_color || '#2563eb' }}>
                        <Bot className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold truncate text-slate-900 dark:text-white">{bot.name}</h3>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
