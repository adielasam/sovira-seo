'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Hand,
  KeyRound,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  ShieldAlert,
  Terminal,
  X,
} from 'lucide-react'

interface LiveBrowserTab {
  index: number
  title: string
  url: string
  active: boolean
}

interface LiveBrowserSessionState {
  ok: boolean
  liveBrowser: boolean
  controlMode: 'idle' | 'agent_running' | 'human_control'
  pauseReason: string | null
  viewport: { width: number; height: number }
  activeTabIndex: number
  tabs: LiveBrowserTab[]
  activeRun: {
    runId: string
    taskId: string
    status: string
    currentStepOrder: number
  } | null
}

interface StateApiResponse {
  configured: boolean
  online: boolean
  liveBrowser: boolean
  needsWorkerUpgrade?: boolean
  workerHost: string
  state: LiveBrowserSessionState | null
  error?: string
}

export interface LiveBrowserPanelProps {
  activeTaskId?: string | null
  activeTaskStatus?: string | null
  onControlChanged?: (controlMode: 'idle' | 'agent_running' | 'human_control') => void
  onWorkerStatusChange?: (online: boolean) => void
}

const KEY_PILLS = [
  { label: 'Enter', key: 'Enter' },
  { label: 'Tab', key: 'Tab' },
  { label: 'Backspace', key: 'Backspace' },
  { label: 'Esc', key: 'Escape' },
]

export function LiveBrowserPanel({
  activeTaskId,
  activeTaskStatus,
  onControlChanged,
  onWorkerStatusChange,
}: LiveBrowserPanelProps) {
  const [statusData, setStatusData] = useState<StateApiResponse | null>(null)
  const [loadingState, setLoadingState] = useState(true)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [addressFocused, setAddressFocused] = useState(false)
  const [quickTypeText, setQuickTypeText] = useState('')
  const [controlBusy, setControlBusy] = useState(false)
  const [clickRipple, setClickRipple] = useState<{ xPct: number; yPct: number; id: number } | null>(null)

  // Quick-connect VPS credentials state (when not yet connected)
  const [workerUrlInput, setWorkerUrlInput] = useState('http://102.209.46.229:8080')
  const [workerTokenInput, setWorkerTokenInput] = useState('')
  const [savingConnect, setSavingConnect] = useState(false)
  const [showSetupForm, setShowSetupForm] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const frameFetchingRef = useRef(false)
  const activeObjectUrlRef = useRef<string | null>(null)
  const lastWheelAtRef = useRef(0)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/live-browser/state', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as StateApiResponse
      setStatusData(data)
      onWorkerStatusChange?.(Boolean(data.online))

      const activeTab = data.state?.tabs?.find((t) => t.active) || data.state?.tabs?.[0]
      if (activeTab?.url && !addressFocused) {
        setAddressInput(activeTab.url)
      }
      if (data.state?.controlMode) {
        onControlChanged?.(data.state.controlMode)
      }
    } catch {
      // ignore transient state poll failures
    } finally {
      setLoadingState(false)
    }
  }, [addressFocused, onControlChanged, onWorkerStatusChange])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  // Adaptive state polling
  const controlMode = statusData?.state?.controlMode || 'idle'
  const isBusyMode =
    controlMode === 'agent_running' ||
    controlMode === 'human_control' ||
    activeTaskStatus === 'running' ||
    activeTaskStatus === 'waiting_human_verification'

  useEffect(() => {
    const intervalMs = isBusyMode ? 1800 : 4500
    const timer = setInterval(fetchState, intervalMs)
    return () => clearInterval(timer)
  }, [fetchState, isBusyMode])

  // Smooth JPEG live frame streaming without request pileups
  const fetchFrame = useCallback(async () => {
    if (!statusData?.online || !statusData?.liveBrowser) return
    if (frameFetchingRef.current) return
    frameFetchingRef.current = true
    try {
      const res = await fetch(`/api/assistant/live-browser/frame?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const blob = await res.blob()
      const nextUrl = URL.createObjectURL(blob)
      const prevUrl = activeObjectUrlRef.current
      activeObjectUrlRef.current = nextUrl
      setFrameUrl(nextUrl)
      if (prevUrl) {
        setTimeout(() => URL.revokeObjectURL(prevUrl), 150)
      }
    } catch {
      // ignore single dropped frame
    } finally {
      frameFetchingRef.current = false
    }
  }, [statusData?.online, statusData?.liveBrowser])

  useEffect(() => {
    if (!statusData?.online || !statusData?.liveBrowser) return
    fetchFrame()
    const timer = setInterval(fetchFrame, isBusyMode ? 550 : 2500)
    return () => clearInterval(timer)
  }, [fetchFrame, statusData?.online, statusData?.liveBrowser, isBusyMode])

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current)
      }
    }
  }, [])

  const sendInput = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/assistant/live-browser/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Input failed')
      }
      await fetchFrame()
      await fetchState()
    } catch (err: any) {
      toast.error(err?.message || 'Browser input failed')
    }
  }

  const handleToggleControl = async () => {
    const action = controlMode === 'human_control' ? 'release' : 'takeover'
    setControlBusy(true)
    try {
      const res = await fetch('/api/assistant/live-browser/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          taskId: activeTaskId || undefined,
          reason: action === 'takeover' ? 'User took interactive control of browser' : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Control switch failed')
      await fetchState()
      onControlChanged?.(data.controlMode)

      if (action === 'takeover') {
        viewportRef.current?.focus()
        toast.success('You now have browser control. Agent is paused until you click Done.')
      } else {
        toast.success('Returned browser control to agent.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed switching browser control')
    } finally {
      setControlBusy(false)
    }
  }

  const handleViewportClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    viewportRef.current?.focus()
    if (controlMode === 'agent_running') {
      toast('Click "Take control of the browser" first so the agent pauses while you click.', {
        icon: '✋',
      })
      return
    }
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const xRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const yRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    const x = Math.round(xRatio * 1280)
    const y = Math.round(yRatio * 800)

    setClickRipple({ xPct: xRatio * 100, yPct: yRatio * 100, id: Date.now() })
    await sendInput({ type: 'click', x, y, button: 'left', clickCount: 1 })
  }

  const handleViewportWheel = async (e: React.WheelEvent<HTMLDivElement>) => {
    if (controlMode === 'agent_running') return
    const now = Date.now()
    if (now - lastWheelAtRef.current < 160) return
    lastWheelAtRef.current = now
    await sendInput({ type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY })
  }

  const handleViewportKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (controlMode === 'agent_running') return
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const specialKeys = ['Enter', 'Backspace', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    if (specialKeys.includes(e.key)) {
      e.preventDefault()
      await sendInput({ type: 'key', key: e.key })
      return
    }

    if (e.key.length === 1) {
      e.preventDefault()
      await sendInput({ type: 'type', text: e.key })
    }
  }

  const handleNavigateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = addressInput.trim()
    if (!raw) return
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    setAddressFocused(false)
    await sendInput({ type: 'navigate', url: normalized })
  }

  const handleQuickTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTypeText) return
    const textToSend = quickTypeText
    setQuickTypeText('')
    await sendInput({ type: 'type', text: textToSend })
  }

  const handleConnectWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = workerUrlInput.trim().replace(/\/+$/, '')
    const cleanToken = workerTokenInput.trim()
    if (!cleanUrl || !cleanToken) {
      toast.error('Please enter both the Worker Base URL and Bearer Token.')
      return
    }

    setSavingConnect(true)
    try {
      const saveRes = await fetch('/api/assistant/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'browser_worker',
          credentials: { workerUrl: cleanUrl, workerToken: cleanToken },
          enabled: true,
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData?.error || 'Failed to save worker connection')

      const testRes = await fetch('/api/assistant/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'browser_worker' }),
      })
      const testData = await testRes.json()
      if (testData.ok) {
        toast.success(testData.message)
        setShowSetupForm(false)
        setWorkerTokenInput('')
      } else {
        toast.error(testData.message || 'Worker saved, but connection check reported an issue.')
      }
      await fetchState()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to connect cloud browser worker')
    } finally {
      setSavingConnect(false)
    }
  }

  const state = statusData?.state
  const tabs = state?.tabs || []
  const isHumanControl = controlMode === 'human_control'
  const isAgentRunning = controlMode === 'agent_running'

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
      {/* Top Muse.ai-Style Live Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Browser</h3>
              {statusData?.online && statusData?.liveBrowser ? (
                isHumanControl ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <Hand className="h-3 w-3" />
                    You Have Control (Paused)
                  </span>
                ) : isAgentRunning ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Agent Controlling
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Browser Live
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {statusData?.needsWorkerUpgrade ? 'Upgrade Required' : 'Not Connected'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {statusData?.workerHost
                ? `Cloud Chromium @ ${statusData.workerHost}`
                : 'Connect your Nobus Ubuntu VPS Chromium worker'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusData?.online && statusData?.liveBrowser && (
            <button
              type="button"
              disabled={controlBusy}
              onClick={handleToggleControl}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                isHumanControl ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {controlBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isHumanControl ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Hand className="h-3.5 w-3.5" />
              )}
              {isHumanControl ? 'Done — Hand Back to Agent' : 'Take control of the browser'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSetupForm((v) => !v)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Configure Cloud Worker URL & Token"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Pause Reason / CAPTCHA Callout */}
      {isHumanControl && state?.pauseReason && (
        <div className="border-b border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{state.pauseReason}</span>
          </div>
          <span className="shrink-0 font-semibold">Click &amp; type below, then click Done</span>
        </div>
      )}

      {/* Setup / Reconnect Card when unconfigured, offline, needs upgrade, or toggled */}
      {(showSetupForm || !statusData?.configured || !statusData?.online || !statusData?.liveBrowser) && !loadingState && (
        <div className="p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
          {statusData?.needsWorkerUpgrade && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <Terminal className="h-4 w-4" />
                Nobus Worker Found — Enable Live Browser Frame &amp; Takeover Mode
              </p>
              <p>
                Your VPS responded on <code className="font-mono">/health</code>, but does not yet run{' '}
                <code className="font-mono">live-browser-server.mjs</code>. Update the server script in{' '}
                <code className="font-mono">/opt/sovira-worker</code> and restart{' '}
                <code className="font-mono">sovira-worker</code>.
              </p>
            </div>
          )}

          {statusData?.error && !statusData?.needsWorkerUpgrade && (
            <p className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {statusData.error}
            </p>
          )}

          <form onSubmit={handleConnectWorker} className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Worker Base URL
                </label>
                <input
                  type="url"
                  value={workerUrlInput}
                  onChange={(e) => setWorkerUrlInput(e.target.value)}
                  placeholder="http://102.209.46.229:8080"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Bearer Token (/opt/sovira-worker/token.txt)
                </label>
                <input
                  type="password"
                  value={workerTokenInput}
                  onChange={(e) => setWorkerTokenInput(e.target.value)}
                  placeholder="Paste WORKER_TOKEN"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={fetchState}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recheck Status
              </button>
              <button
                type="submit"
                disabled={savingConnect}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingConnect ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Save &amp; Connect VPS Browser
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chrome-Style Tabs Bar + Address Toolbar + Viewport */}
      {loadingState ? (
        <div className="flex items-center justify-center py-20 text-xs text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting to Live Browser...
        </div>
      ) : statusData?.online && statusData?.liveBrowser ? (
        <>
          {/* Browser Tabs Strip */}
          <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-950 px-2 pt-2 border-b border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => (
              <div
                key={tab.index}
                className={`group flex max-w-[190px] items-center gap-1.5 rounded-t-lg px-2.5 py-1.5 text-xs border border-b-0 transition-colors cursor-pointer ${
                  tab.active
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                }`}
                onClick={() => sendInput({ type: 'switch_tab', index: tab.index })}
              >
                <Globe className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate flex-1">{tab.title || tab.url || 'New Tab'}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    sendInput({ type: 'close_tab', index: tab.index })
                  }}
                  className="opacity-60 hover:opacity-100 hover:text-red-500"
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => sendInput({ type: 'new_tab' })}
              className="mb-1 rounded-md p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Open new tab"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Navigation & URL Bar */}
          <form
            onSubmit={handleNavigateSubmit}
            className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2"
          >
            <button
              type="button"
              disabled={isAgentRunning}
              onClick={() => sendInput({ type: 'back' })}
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              title="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isAgentRunning}
              onClick={() => sendInput({ type: 'forward' })}
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              title="Forward"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => sendInput({ type: 'reload' })}
              className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Reload"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>

            <input
              type="text"
              value={addressInput}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
              onChange={(e) => setAddressInput(e.target.value)}
              disabled={isAgentRunning}
              placeholder="Enter website URL (e.g., https://www.enetsupremeacademy.com)"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isAgentRunning}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
            >
              <ExternalLink className="h-3 w-3" />
              Go
            </button>
          </form>

          {/* Interactive Live Chromium Canvas (1280x800 aspect ratio) */}
          <div
            ref={viewportRef}
            tabIndex={0}
            onWheel={handleViewportWheel}
            onKeyDown={handleViewportKeyDown}
            className={`relative aspect-[16/10] w-full bg-slate-950 overflow-hidden select-none focus:outline-none ${
              isHumanControl ? 'ring-2 ring-inset ring-emerald-500/70' : ''
            }`}
          >
            {frameUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={frameUrl}
                alt="Live Cloud Browser Stream"
                draggable={false}
                onClick={handleViewportClick}
                className={`h-full w-full object-contain ${isAgentRunning ? 'cursor-wait' : 'cursor-pointer'}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live browser frame...
              </div>
            )}

            {clickRipple && (
              <span
                key={clickRipple.id}
                style={{ left: `${clickRipple.xPct}%`, top: `${clickRipple.yPct}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 border-blue-400 bg-blue-500/20 animate-ping"
              />
            )}
          </div>

          {/* Quick Text & Key Toolbar */}
          <form
            onSubmit={handleQuickTypeSubmit}
            className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-2"
          >
            <input
              type="text"
              value={quickTypeText}
              onChange={(e) => setQuickTypeText(e.target.value)}
              disabled={isAgentRunning}
              placeholder={
                isAgentRunning
                  ? 'Click "Take control of the browser" above to type or click...'
                  : 'Click a field in the browser above, then type here or directly on screen...'
              }
              className="flex-1 min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAgentRunning || !quickTypeText}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              Type
            </button>
            <div className="flex items-center gap-1">
              {KEY_PILLS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  disabled={isAgentRunning}
                  onClick={() => sendInput({ type: 'key', key: k.key })}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  {k.label}
                </button>
              ))}
            </div>
          </form>
        </>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Connect your Nobus Ubuntu VPS worker above to view real Chromium tabs, click, log into websites, and hand tasks back to the AI agent.
        </div>
      )}
    </div>
  )
}
