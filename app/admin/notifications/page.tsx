'use client'

import { useState } from 'react'
import { sendGlobalNotification } from './actions'
import toast from 'react-hot-toast'
import { Send, Globe } from 'lucide-react'

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [isSending, setIsSending] = useState(false)

  const handleSendGlobal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)
    
    const { error } = await sendGlobalNotification(title, message, type)

    setIsSending(false)

    if (error) {
      toast.error('Failed to send global notification')
    } else {
      toast.success('Global notification sent to all users!')
      setTitle('')
      setMessage('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications Center</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Send system-wide alerts or target specific users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Global Broadcast</h2>
              <p className="text-sm text-slate-500">Sends to every registered user.</p>
            </div>
          </div>

          <form onSubmit={handleSendGlobal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alert Title</label>
              <input 
                required
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Maintenance"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
              <textarea 
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Information (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Orange)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Broadcasting...' : 'Broadcast to All Users'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-50 pointer-events-none">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">Target Specific User</h2>
          <p className="text-sm text-slate-500 mb-4">Search user by email to send a targeted message. (Coming soon)</p>
          <input disabled type="text" placeholder="Search user email..." className="w-full mb-4 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
          <button disabled className="w-full py-2.5 bg-slate-200 text-slate-500 rounded-lg font-medium">Send Notification</button>
        </div>
      </div>
    </div>
  )
}
