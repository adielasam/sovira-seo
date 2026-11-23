'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Ban,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react'
import { AssistantNav } from './AssistantNav'

interface HistoryTask {
  id: string
  instruction: string
  category: string
  status: string
  source: string
  retry_count: number
  max_retries: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export function AutomationHistoryView() {
  const [tasks, setTasks] = useState<HistoryTask[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [workerOnline, setWorkerOnline] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksRes, intRes] = await Promise.all([
        fetch('/api/assistant/tasks?limit=100'),
        fetch('/api/assistant/integrations'),
      ])
      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks(data.tasks || [])
      }
      if (intRes.ok) {
        const intData = await intRes.json()
        const worker = (intData.integrations || []).find((i: any) => i.provider === 'browser_worker')
        setWorkerOnline(worker?.status === 'connected')
      }
    } catch {
      toast.error('Failed to load automation history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          t.instruction.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.error_message || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [tasks, statusFilter, search])

  const triggerAction = async (id: string, action: 'retry' | 'cancel') => {
    try {
      const res = await fetch(`/api/assistant/tasks/${id}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`)
      toast.success(action === 'retry' ? 'Task queued for retry.' : 'Cancellation sent.')
      await loadHistory()
    } catch (err: any) {
      toast.error(err?.message || 'Action failed')
    }
  }

  const [processingQueue, setProcessingQueue] = useState(false)
  const hasQueued = useMemo(() => tasks.some((t) => t.status === 'queued'), [tasks])

  const processQueuedJobs = async () => {
    setProcessingQueue(true)
    try {
      const res = await fetch('/api/assistant/jobs/process', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed processing queue')
      toast.success(data.message || 'Queue processed.')
      await loadHistory()
    } catch (err: any) {
      toast.error(err?.message || 'Failed processing queue')
    } finally {
      setProcessingQueue(false)
    }
  }

  return (
    <div>
      <AssistantNav workerOnline={workerOnline} />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, errors, or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasQueued && (
              <button
                type="button"
                disabled={processingQueue}
                onClick={processQueuedJobs}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {processingQueue ? 'Processing...' : 'Process Queued Jobs'}
              </button>
            )}
            {['all', 'waiting_approval', 'queued', 'running', 'completed', 'failed', 'cancelled'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
            <button
              type="button"
              onClick={loadHistory}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading task ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No task history records match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                  <th className="py-3 pr-4">Instruction</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Source</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Retries</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 pr-4 max-w-sm">
                      <p className="font-medium text-slate-900 dark:text-white line-clamp-2">{task.instruction}</p>
                      {task.error_message && (
                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 line-clamp-1">
                          {task.error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{task.category}</td>
                    <td className="py-3 pr-4 uppercase text-slate-500">{task.source}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200">
                      {task.status}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                      {task.retry_count}/{task.max_retries}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                      {new Date(task.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap space-x-2">
                      {['failed', 'cancelled'].includes(task.status) && task.retry_count < task.max_retries && (
                        <button
                          type="button"
                          onClick={() => triggerAction(task.id, 'retry')}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          <Play className="h-3 w-3" /> Retry
                        </button>
                      )}
                      {['waiting_approval', 'queued', 'running', 'waiting_external'].includes(task.status) && (
                        <button
                          type="button"
                          onClick={() => triggerAction(task.id, 'cancel')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                        >
                          <Ban className="h-3 w-3" /> Cancel
                        </button>
                      )}
                      <Link
                        href="/assistant"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
