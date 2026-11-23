import { redactSecretsInText } from './crypto'
import { resolveProviderCredentials } from './integrations/vault'

export interface LiveBrowserTab {
  index: number
  title: string
  url: string
  active: boolean
}

export interface LiveBrowserRemoteRunSummary {
  runId: string
  taskId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  currentStepOrder: number
  startedAt: string
  completedAt: string | null
  error: string | null
}

export interface LiveBrowserSessionState {
  ok: boolean
  liveBrowser: boolean
  controlMode: 'idle' | 'agent_running' | 'human_control'
  pauseReason: string | null
  viewport: { width: number; height: number }
  activeTabIndex: number
  tabs: LiveBrowserTab[]
  activeRun: LiveBrowserRemoteRunSummary | null
}

export interface RemoteBrowserStepLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'security' | 'audit'
  stepOrder: number | null
  message: string
}

export interface RemoteBrowserRunDetail {
  runId: string
  taskId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  controlMode: 'idle' | 'agent_running' | 'human_control'
  pauseReason: string | null
  currentStepOrder: number
  logs: RemoteBrowserStepLog[]
  stepResults: Array<Record<string, unknown>>
  startedAt: string
  completedAt: string | null
  error: string | null
}

export interface LiveBrowserConfig {
  configured: boolean
  enabled: boolean
  workerUrl: string
  workerHost: string
  workerToken: string
}

export async function resolveLiveBrowserConfig(userId: string): Promise<LiveBrowserConfig> {
  const resolved = await resolveProviderCredentials(userId, 'browser_worker').catch(() => ({
    enabled: true,
    credentials: {} as Record<string, string>,
    metadata: {} as Record<string, unknown>,
  }))

  const rawUrl = String(
    resolved.credentials.workerUrl || resolved.metadata?.workerUrl || process.env.SOVIRA_BROWSER_WORKER_URL || ''
  )
    .trim()
    .replace(/\/+$/, '')

  const workerToken = String(
    resolved.credentials.workerToken || process.env.SOVIRA_BROWSER_WORKER_TOKEN || ''
  ).trim()

  let workerUrl = ''
  let workerHost = ''
  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    try {
      const parsed = new URL(rawUrl)
      workerUrl = parsed.origin
      workerHost = parsed.host
    } catch {
      workerUrl = ''
    }
  }

  return {
    configured: Boolean(workerUrl && workerToken),
    enabled: resolved.enabled,
    workerUrl,
    workerHost,
    workerToken,
  }
}

export async function checkLiveBrowserHealth(userId: string): Promise<{
  configured: boolean
  online: boolean
  liveBrowser: boolean
  workerUrl: string
  workerHost: string
  health: Record<string, unknown> | null
  error?: string
}> {
  const cfg = await resolveLiveBrowserConfig(userId)
  if (!cfg.configured || !cfg.enabled) {
    return {
      configured: cfg.configured,
      online: false,
      liveBrowser: false,
      workerUrl: cfg.workerUrl,
      workerHost: cfg.workerHost,
      health: null,
      error: !cfg.enabled ? 'Cloud Browser Worker is disabled.' : 'Cloud Browser Worker URL or Token not configured.',
    }
  }

  try {
    const res = await fetch(`${cfg.workerUrl}/health`, {
      signal: AbortSignal.timeout(3500),
      cache: 'no-store',
    })
    const health = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const online = Boolean(res.ok && health?.ok)
    return {
      configured: true,
      online,
      liveBrowser: Boolean(health?.liveBrowser),
      workerUrl: cfg.workerUrl,
      workerHost: cfg.workerHost,
      health,
      error: online ? undefined : `Health check returned HTTP ${res.status}`,
    }
  } catch (err: any) {
    return {
      configured: true,
      online: false,
      liveBrowser: false,
      workerUrl: cfg.workerUrl,
      workerHost: cfg.workerHost,
      health: null,
      error: redactSecretsInText(err?.message || 'Worker health check timed out'),
    }
  }
}

export async function callLiveBrowserJson<T = Record<string, unknown>>(
  userId: string,
  apiPath: string,
  opts: {
    method?: 'GET' | 'POST'
    body?: unknown
    timeoutMs?: number
  } = {}
): Promise<T> {
  const cfg = await resolveLiveBrowserConfig(userId)
  if (!cfg.enabled) {
    throw new Error('Cloud Browser Worker is disabled in Connected Accounts.')
  }
  if (!cfg.configured) {
    throw new Error('Cloud Browser Worker URL and Bearer Token must be saved first.')
  }

  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  const res = await fetch(`${cfg.workerUrl}${normalizedPath}`, {
    method: opts.method || 'GET',
    headers: {
      Authorization: `Bearer ${cfg.workerToken}`,
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(opts.timeoutMs ?? 12000),
    cache: 'no-store',
  })

  const data = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const msg = data?.error || `Worker returned HTTP ${res.status}`
    throw new Error(redactSecretsInText(String(msg)))
  }
  return data as T
}

export async function fetchLiveBrowserFrame(
  userId: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const cfg = await resolveLiveBrowserConfig(userId)
  if (!cfg.enabled || !cfg.configured) {
    throw new Error('Cloud Browser Worker is not configured or disabled.')
  }

  const res = await fetch(`${cfg.workerUrl}/session/frame`, {
    headers: {
      Authorization: `Bearer ${cfg.workerToken}`,
    },
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Frame request failed with HTTP ${res.status}`)
  }

  const buffer = await res.arrayBuffer()
  return {
    buffer,
    contentType: res.headers.get('content-type') || 'image/jpeg',
  }
}

export async function getLiveBrowserState(userId: string): Promise<{
  configured: boolean
  online: boolean
  liveBrowser: boolean
  needsWorkerUpgrade?: boolean
  workerHost: string
  state: LiveBrowserSessionState | null
  error?: string
}> {
  const cfg = await resolveLiveBrowserConfig(userId)
  if (!cfg.configured || !cfg.enabled) {
    return {
      configured: cfg.configured,
      online: false,
      liveBrowser: false,
      workerHost: cfg.workerHost,
      state: null,
      error: !cfg.enabled ? 'Cloud Browser Worker is disabled.' : 'Not configured yet.',
    }
  }

  const healthCheck = await checkLiveBrowserHealth(userId)
  if (!healthCheck.online) {
    return {
      configured: true,
      online: false,
      liveBrowser: false,
      workerHost: cfg.workerHost,
      state: null,
      error: healthCheck.error,
    }
  }

  if (!healthCheck.liveBrowser) {
    return {
      configured: true,
      online: true,
      liveBrowser: false,
      needsWorkerUpgrade: true,
      workerHost: cfg.workerHost,
      state: null,
      error:
        'Worker is reachable on /health, but live preview endpoints are not active yet. Upgrade /opt/sovira-worker with worker/live-browser-server.mjs.',
    }
  }

  try {
    const state = await callLiveBrowserJson<LiveBrowserSessionState>(userId, '/session/state', {
      timeoutMs: 8000,
    })
    return {
      configured: true,
      online: true,
      liveBrowser: true,
      workerHost: cfg.workerHost,
      state,
    }
  } catch (err: any) {
    return {
      configured: true,
      online: false,
      liveBrowser: false,
      workerHost: cfg.workerHost,
      state: null,
      error: redactSecretsInText(err?.message || 'Failed to read browser session state'),
    }
  }
}

export async function setLiveBrowserControl(
  userId: string,
  action: 'takeover' | 'release',
  reason?: string
): Promise<{ ok: boolean; controlMode: 'idle' | 'agent_running' | 'human_control'; pauseReason: string | null }> {
  return await callLiveBrowserJson(userId, `/session/${action}`, {
    method: 'POST',
    body: { reason },
    timeoutMs: 8000,
  })
}

export async function sendLiveBrowserInput(
  userId: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; activeTabIndex: number; tabs: LiveBrowserTab[] }> {
  return await callLiveBrowserJson(userId, '/session/input', {
    method: 'POST',
    body: input,
    timeoutMs: 20000,
  })
}

export async function startRemoteBrowserRun(
  userId: string,
  payload: {
    runId: string
    taskId: string
    steps: Array<{ stepOrder: number; toolName: string; parameters: Record<string, unknown> }>
  }
): Promise<{ ok: boolean; accepted: boolean; runId: string }> {
  return await callLiveBrowserJson(userId, '/session/run-task', {
    method: 'POST',
    body: payload,
    timeoutMs: 8000,
  })
}

export async function getRemoteBrowserRunStatus(
  userId: string,
  runId: string
): Promise<{
  ok: boolean
  controlMode: 'idle' | 'agent_running' | 'human_control'
  pauseReason: string | null
  run: RemoteBrowserRunDetail
}> {
  return await callLiveBrowserJson(userId, `/session/run-status/${encodeURIComponent(runId)}`, {
    method: 'GET',
    timeoutMs: 6000,
  })
}

export async function cancelRemoteBrowserRun(userId: string, runId?: string): Promise<void> {
  await callLiveBrowserJson(userId, '/session/cancel-run', {
    method: 'POST',
    body: { runId },
    timeoutMs: 5000,
  }).catch(() => {})
}
