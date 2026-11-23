'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Ban,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { AssistantNav } from './AssistantNav'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  taskId?: string
  attachments?: Array<{ name: string; type?: string; size?: number }>
  createdAt: string
}

interface ConversationRecord {
  id: string
  title: string
  messages: ConversationMessage[]
  updated_at: string
}

interface TaskStep {
  id: string
  step_order: number
  title: string
  tool_name: string
  parameters: Record<string, unknown>
  requires_approval: boolean
  status: string
  output: Record<string, unknown> | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

interface TaskLog {
  id: string
  level: string
  step_order: number | null
  message: string
  created_at: string
}

interface TaskRecord {
  id: string
  conversation_id: string | null
  instruction: string
  category: string
  status: string
  approval_required: boolean
  approval_status: string
  cancel_requested: boolean
  retry_count: number
  max_retries: number
  error_code: string | null
  error_message: string | null
  source: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  plan: {
    summary?: string
    category?: string
    riskLevel?: string
    expectedOutputs?: string[]
    requiredIntegrations?: string[]
    readinessWarnings?: Array<{ provider: string; status: string; message: string }>
    plannerMeta?: { provider: string; model: string; latencyMs: number; failoverUsed: boolean }
  }
  result: {
    summary?: string
    reportMarkdown?: string
    stepOutputs?: Array<Record<string, unknown>>
  } | null
}

const EXAMPLE_INSTRUCTIONS = [
  'Research the best tools for creating African story videos, compare them and prepare a report.',
  'Create an original 60-second African folktale storyboard with YouTube SEO metadata and subtitles.',
  'Navigate to a target website with Playwright, capture a screenshot, and summarize key page headings.',
]

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  planning: {
    label: 'Thinking / Planning',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  waiting_approval: {
    label: 'Waiting for Approval',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  queued: {
    label: 'Queued for Worker',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  waiting_external: {
    label: 'Waiting External Service',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  waiting_human_verification: {
    label: 'Paused: Human Verification',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  cancelling: {
    label: 'Cancelling...',
    className: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_BADGES[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {(status === 'running' || status === 'planning' || status === 'cancelling') && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {cfg.label}
    </span>
  )
}

export function AssistantWorkspace() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskSteps, setTaskSteps] = useState<TaskStep[]>([])
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])
  const [taskFilter, setTaskFilter] = useState<string>('all')

  const [instruction, setInstruction] = useState('')
  const [attachments, setAttachments] = useState<Array<{ name: string; type?: string; size?: number; summary?: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [workerOnline, setWorkerOnline] = useState<boolean>(false)
  const [showRawJson, setShowRawJson] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadWorkspace = useCallback(async () => {
    try {
      const [chatRes, intRes] = await Promise.all([
        fetch('/api/assistant/chat'),
        fetch('/api/assistant/integrations'),
      ])
      if (chatRes.ok) {
        const data = await chatRes.json()
        setConversations(data.conversations || [])
        setTasks(data.tasks || [])
        if (!selectedTaskId && data.tasks?.length > 0) {
          setSelectedTaskId(data.tasks[0].id)
        }
        if (!activeConversationId && data.conversations?.length > 0) {
          setActiveConversationId(data.conversations[0].id)
        }
      }
      if (intRes.ok) {
        const intData = await intRes.json()
        const worker = (intData.integrations || []).find((i: any) => i.provider === 'browser_worker')
        setWorkerOnline(worker?.status === 'connected')
      }
    } catch {
      // Handled silently on initial poll
    } finally {
      setLoadingInitial(false)
    }
  }, [activeConversationId, selectedTaskId])

  const loadTaskDetail = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/assistant/tasks/${taskId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.task) {
        setTasks((prev) => {
          const exists = prev.some((t) => t.id === data.task.id)
          if (!exists) return [data.task, ...prev]
          return prev.map((t) => (t.id === data.task.id ? data.task : t))
        })
      }
      setTaskSteps(data.steps || [])
      setTaskLogs(data.logs || [])
    } catch {
      // ignore transient poll error
    }
  }, [])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId)
    }
  }, [selectedTaskId, loadTaskDetail])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  // Live polling ONLY while selected task is actively running or waiting
  useEffect(() => {
    if (!selectedTask) return
    const activeStates = ['planning', 'queued', 'running', 'waiting_external', 'cancelling']
    if (!activeStates.includes(selectedTask.status)) return

    const timer = setInterval(() => {
      loadTaskDetail(selectedTask.id)
    }, 3000)

    return () => clearInterval(timer)
  }, [selectedTask, loadTaskDetail])

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks
    if (taskFilter === 'active') {
      return tasks.filter((t) =>
        ['planning', 'queued', 'running', 'waiting_external', 'waiting_human_verification', 'cancelling'].includes(t.status)
      )
    }
    return tasks.filter((t) => t.status === taskFilter)
  }, [tasks, taskFilter])

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let summary = `${file.type || 'file'}, ${Math.round(file.size / 1024)} KB`
    if (file.size < 100_000 && /^(text\/|application\/(json|xml))/.test(file.type || 'text/plain')) {
      const content = await file.text().catch(() => '')
      if (content) {
        summary = content.slice(0, 2000)
      }
    }

    setAttachments((prev) => [...prev.slice(0, 4), { name: file.name, type: file.type, size: file.size, summary }])
    e.target.value = ''
  }

  const handleSubmitInstruction = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = instruction.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const idempotencyKey = `web_${crypto.randomUUID()}`
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: trimmed,
          conversationId: activeConversationId,
          idempotencyKey,
          attachments,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to plan task')
      }

      setInstruction('')
      setAttachments([])
      setActiveConversationId(data.conversationId)
      setSelectedTaskId(data.task.id)
      setTaskSteps(data.steps || [])
      await loadWorkspace()
      await loadTaskDetail(data.task.id)
      toast.success('Structured task plan generated. Review and approve to run.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTaskAction = async (taskId: string, action: 'approve' | 'reject' | 'cancel' | 'retry') => {
    setActionLoading(`${taskId}:${action}`)
    try {
      const res = await fetch(`/api/assistant/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} task`)
      }

      await loadTaskDetail(taskId)
      await loadWorkspace()

      if (action === 'approve') {
        toast.success(data.workerQueued ? 'Approved & queued for durable background worker.' : 'Approved & executed cleanly.')
      } else if (action === 'reject') {
        toast.success('Task plan rejected.')
      } else if (action === 'cancel') {
        toast.success('Cancellation signal sent.')
      } else {
        toast.success('Task queued for retry.')
      }
    } catch (err: any) {
      toast.error(err?.message || `Action failed`)
    } finally {
      setActionLoading(null)
    }
  }

  const startNewTaskSession = () => {
    setActiveConversationId(null)
    setInstruction('')
    setAttachments([])
    toast.success('Ready for a new task instruction.')
  }

  const copyMarkdownReport = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Report copied to clipboard.')
  }

  const hasQueuedTasks = useMemo(() => tasks.some((t) => t.status === 'queued'), [tasks])
  const [processingQueue, setProcessingQueue] = useState(false)

  const handleProcessQueue = async () => {
    setProcessingQueue(true)
    try {
      const res = await fetch('/api/assistant/jobs/process', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Queue processing failed')
      toast.success(data.message || 'Queue check completed.')
      await loadWorkspace()
      if (data.taskId) await loadTaskDetail(data.taskId)
    } catch (err: any) {
      toast.error(err?.message || 'Queue processing error')
    } finally {
      setProcessingQueue(false)
    }
  }

  return (
    <div>
      <AssistantNav workerOnline={workerOnline} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar: New Task, Conversations & Task Queue */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <button
              type="button"
              onClick={startNewTaskSession}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Task Instruction
            </button>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Task Queue ({filteredTasks.length})
                </h2>
                <div className="flex items-center gap-2">
                  {hasQueuedTasks && (
                    <button
                      type="button"
                      disabled={processingQueue}
                      onClick={handleProcessQueue}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      {processingQueue ? 'Running...' : 'Process Queued'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => loadWorkspace()}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Refresh queue"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'waiting_approval', label: 'Approval' },
                  { id: 'active', label: 'Active' },
                  { id: 'failed', label: 'Failed' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      taskFilter === f.id
                        ? 'bg-slate-900 text-white dark:bg-blue-600'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingInitial ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading durable queue...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                  No tasks match this filter. Issue an instruction to create your first plan.
                </div>
              ) : (
                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {filteredTasks.map((t) => {
                    const isSelected = t.id === selectedTaskId
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(t.id)
                          if (t.conversation_id) setActiveConversationId(t.conversation_id)
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-600'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <StatusPill status={t.status} />
                          <span className="text-[11px] uppercase text-slate-400 font-medium">{t.source}</span>
                        </div>
                        <p className="line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                          {t.instruction}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Conversation History Selector */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Conversation History
            </h2>
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500">No conversations yet.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      conv.id === activeConversationId
                        ? 'bg-slate-900 text-white dark:bg-slate-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p className="truncate font-medium">{conv.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Column: Chat Composer + Plan Approval + Execution Progress + Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* Instruction Composer */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Issue Executive Task Instruction
              </h2>
            </div>

            {activeConversation && activeConversation.messages?.length > 0 && (
              <div className="mb-4 max-h-56 space-y-2.5 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3">
                {activeConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 text-xs ${
                      msg.role === 'user' ? 'text-slate-800 dark:text-slate-200' : 'text-blue-900 dark:text-blue-200'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        msg.role === 'user'
                          ? 'bg-slate-200 dark:bg-slate-700'
                          : 'bg-blue-100 dark:bg-blue-900'
                      }`}
                    >
                      {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.taskId && (
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(msg.taskId!)}
                          className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Inspect Task Plan & Status →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitInstruction} className="space-y-3">
              <textarea
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe what you want planned and executed (e.g., Research the best tools for creating African story videos, compare them and prepare a report)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {att.name}
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileAttach}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach Context
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !instruction.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Planning Task...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Plan Task
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              {EXAMPLE_INSTRUCTIONS.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInstruction(ex)}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-left text-[11px] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                >
                  {ex.slice(0, 62)}...
                </button>
              ))}
            </div>
          </div>

          {/* Selected Task Inspector: Plan Approval, Real Execution Progress, Logs & Results */}
          {selectedTask ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={selectedTask.status} />
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {selectedTask.category}
                      </span>
                      {selectedTask.plan?.plannerMeta && (
                        <span className="text-[11px] text-slate-400">
                          Planned via {selectedTask.plan.plannerMeta.provider} ({selectedTask.plan.plannerMeta.model})
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                      {selectedTask.instruction}
                    </h3>
                    {selectedTask.plan?.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedTask.plan.summary}</p>
                    )}
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="flex flex-wrap shrink-0 gap-2">
                    {selectedTask.status === 'waiting_approval' && (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(actionLoading)}
                          onClick={() => handleTaskAction(selectedTask.id, 'approve')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actionLoading === `${selectedTask.id}:approve` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3.5 w-3.5" />
                          )}
                          Approve & Execute
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoading)}
                          onClick={() => handleTaskAction(selectedTask.id, 'reject')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {['waiting_approval', 'queued', 'running', 'waiting_external', 'waiting_human_verification'].includes(
                      selectedTask.status
                    ) && (
                      <button
                        type="button"
                        disabled={Boolean(actionLoading)}
                        onClick={() => handleTaskAction(selectedTask.id, 'cancel')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}

                    {['failed', 'cancelled'].includes(selectedTask.status) &&
                      selectedTask.retry_count < selectedTask.max_retries && (
                        <button
                          type="button"
                          disabled={Boolean(actionLoading)}
                          onClick={() => handleTaskAction(selectedTask.id, 'retry')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Retry ({selectedTask.retry_count}/{selectedTask.max_retries})
                        </button>
                      )}
                  </div>
                </div>

                {/* Integration Readiness Warnings */}
                {selectedTask.plan?.readinessWarnings && selectedTask.plan.readinessWarnings.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      Integration & Worker Readiness Notices
                    </div>
                    {selectedTask.plan.readinessWarnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700 dark:text-amber-300/90 pl-6">
                        • <strong>{w.provider}</strong> ({w.status}): {w.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Honest Error Banner */}
                {selectedTask.error_message && (
                  <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3.5 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        {selectedTask.error_code ? `Error [${selectedTask.error_code}]` : 'Execution Error'}
                      </p>
                      <p className="mt-0.5">{selectedTask.error_message}</p>
                    </div>
                  </div>
                )}

                {/* Step-by-Step Real Execution Progress */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Execution Steps & Tool Plan
                  </h4>
                  <div className="space-y-2.5">
                    {taskSteps.map((step) => (
                      <div
                        key={step.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : step.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : step.status === 'running' ? (
                              <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {step.step_order}. {step.title}
                            </span>
                          </div>
                          <span className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {step.tool_name}
                          </span>
                        </div>
                        {step.error_message && (
                          <p className="mt-1.5 pl-6 text-xs text-red-600 dark:text-red-400">{step.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result Viewer */}
              {selectedTask.result && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Deliverable & Result Viewer</h4>
                    <div className="flex items-center gap-2">
                      {selectedTask.result.reportMarkdown && (
                        <button
                          type="button"
                          onClick={() => copyMarkdownReport(selectedTask.result!.reportMarkdown!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Report
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRawJson((v) => !v)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {showRawJson ? 'Formatted View' : 'Inspect JSON'}
                      </button>
                    </div>
                  </div>

                  {showRawJson ? (
                    <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-emerald-300">
                      {JSON.stringify(selectedTask.result, null, 2)}
                    </pre>
                  ) : selectedTask.result.reportMarkdown ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedTask.result.reportMarkdown}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-700 dark:text-slate-300">
                      {JSON.stringify(selectedTask.result, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Execution & Audit Logs */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Durable Audit & Execution Logs ({taskLogs.length})
                  </h4>
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-slate-950 p-3.5 font-mono text-xs">
                  {taskLogs.length === 0 ? (
                    <span className="text-slate-500">No execution events logged yet.</span>
                  ) : (
                    taskLogs.map((log) => (
                      <div key={log.id} className="flex gap-2">
                        <span className="shrink-0 text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        <span
                          className={`shrink-0 uppercase ${
                            log.level === 'error'
                              ? 'text-red-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : log.level === 'security'
                              ? 'text-purple-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span className="text-slate-200">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 p-10 text-center">
              <Bot className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Select or Create a Task to Begin
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Every task first generates a validated plan for your explicit approval before executing via AI providers, Make.com, Notion, or the Playwright background worker.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
