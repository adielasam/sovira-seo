import { createAdminClient } from '@/lib/supabase/server'
import { isExactAssistantOwnerId } from '../auth'
import {
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
  maskSecretStatus,
  redactSecretsInText,
} from '../crypto'
import { ResolvedAICredentials } from '../ai-provider'
import { INTEGRATION_PROVIDERS, IntegrationProviderId, IntegrationStatusSummary } from '../types'

interface ProviderDefinition {
  provider: IntegrationProviderId
  label: string
  description: string
  envKeys: string[]
  credentialFields: Array<{ key: string; label: string; placeholder: string; secret: boolean }>
}

export const INTEGRATION_CATALOG: Record<IntegrationProviderId, ProviderDefinition> = {
  openrouter: {
    provider: 'openrouter',
    label: 'OpenRouter (Primary AI)',
    description: 'Primary reasoning & task planning router supporting Claude, GPT, and open models.',
    envKeys: ['OPENROUTER_API_KEY'],
    credentialFields: [
      { key: 'apiKey', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...', secret: true },
      { key: 'model', label: 'Preferred Model ID', placeholder: 'anthropic/claude-3.5-sonnet', secret: false },
    ],
  },
  gemini: {
    provider: 'gemini',
    label: 'Google Gemini (Backup AI)',
    description: 'Reuses Sovira Google Gemini integration as failover backup planner and multimodal model.',
    envKeys: ['GEMINI_API_KEY'],
    credentialFields: [
      { key: 'apiKey', label: 'Gemini API Key', placeholder: 'AIza... or AQ....', secret: true },
    ],
  },
  telegram: {
    provider: 'telegram',
    label: 'Private Telegram Bot',
    description: 'Verified two-way bot for submitting instructions, approvals, and receiving completion alerts.',
    envKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_USER_ID', 'TELEGRAM_WEBHOOK_SECRET'],
    credentialFields: [
      { key: 'botToken', label: 'Telegram Bot Token', placeholder: '123456789:ABC...', secret: true },
      { key: 'allowedUserId', label: 'Authorised Telegram User ID', placeholder: 'Numeric Telegram User ID', secret: false },
      { key: 'webhookSecret', label: 'Webhook Secret Token', placeholder: 'High-entropy secret string', secret: true },
    ],
  },
  make: {
    provider: 'make',
    label: 'Make.com Pro',
    description: 'Authenticated webhook dispatch & signed callback correlation for external scenarios.',
    envKeys: ['MAKE_WEBHOOK_URL', 'MAKE_WEBHOOK_SECRET'],
    credentialFields: [
      { key: 'webhookUrl', label: 'Make.com Scenario Webhook URL', placeholder: 'https://hook.eu2.make.com/...', secret: true },
      { key: 'webhookSecret', label: 'HMAC Signing Secret', placeholder: 'Shared HMAC verification secret', secret: true },
    ],
  },
  notion: {
    provider: 'notion',
    label: 'Notion Workspace',
    description: 'Task tracking and content production ledger with graceful degradation when unavailable.',
    envKeys: ['NOTION_API_KEY', 'NOTION_DATABASE_ID'],
    credentialFields: [
      { key: 'apiKey', label: 'Notion Internal Integration Secret', placeholder: 'ntn_... or secret_...', secret: true },
      { key: 'databaseId', label: 'Notion Database ID', placeholder: '32-char Notion database UUID', secret: false },
    ],
  },
  elevenlabs: {
    provider: 'elevenlabs',
    label: 'ElevenLabs Voice Studio',
    description: 'Realistic AI narration synthesis for automated story and video production workflows.',
    envKeys: ['ELEVENLABS_API_KEY'],
    credentialFields: [
      { key: 'apiKey', label: 'ElevenLabs API Key', placeholder: 'xi-...', secret: true },
      { key: 'voiceId', label: 'Default Voice ID', placeholder: '21m00Tcm4TlvDq8ikWAM', secret: false },
    ],
  },
  creatomate: {
    provider: 'creatomate',
    label: 'Creatomate Video Renderer',
    description: 'Programmatic cloud video assembly, subtitles, watermarks, and MP4 rendering.',
    envKeys: ['CREATOMATE_API_KEY'],
    credentialFields: [
      { key: 'apiKey', label: 'Creatomate API Key', placeholder: 'Creatomate bearer token', secret: true },
      { key: 'templateId', label: 'Default Render Template ID', placeholder: 'Optional UUID template', secret: false },
    ],
  },
  google_oauth: {
    provider: 'google_oauth',
    label: 'Google OAuth / YouTube Data API v3',
    description: 'Official OAuth2 credentials for publishing approved video content as private/unlisted drafts.',
    envKeys: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'],
    credentialFields: [
      { key: 'clientId', label: 'Google OAuth Client ID', placeholder: 'xxx.apps.googleusercontent.com', secret: false },
      { key: 'clientSecret', label: 'Google OAuth Client Secret', placeholder: 'GOCSPX-...', secret: true },
      { key: 'refreshToken', label: 'YouTube Refresh Token', placeholder: '1//0g...', secret: true },
    ],
  },
  browser_worker: {
    provider: 'browser_worker',
    label: 'Playwright Browser Worker',
    description: 'Persistent background daemon executing isolated browser navigation, uploads, and captures.',
    envKeys: ['ASSISTANT_WORKER_ID'],
    credentialFields: [],
  },
}

function getEnvCredentialsForProvider(provider: IntegrationProviderId): Record<string, string> {
  switch (provider) {
    case 'openrouter':
      return {
        ...(process.env.OPENROUTER_API_KEY ? { apiKey: process.env.OPENROUTER_API_KEY } : {}),
        ...(process.env.OPENROUTER_PRIMARY_MODEL ? { model: process.env.OPENROUTER_PRIMARY_MODEL } : {}),
      }
    case 'gemini':
      return process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {}
    case 'telegram':
      return {
        ...(process.env.TELEGRAM_BOT_TOKEN ? { botToken: process.env.TELEGRAM_BOT_TOKEN } : {}),
        ...(process.env.TELEGRAM_ALLOWED_USER_ID ? { allowedUserId: process.env.TELEGRAM_ALLOWED_USER_ID } : {}),
        ...(process.env.TELEGRAM_WEBHOOK_SECRET ? { webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET } : {}),
      }
    case 'make':
      return {
        ...(process.env.MAKE_WEBHOOK_URL ? { webhookUrl: process.env.MAKE_WEBHOOK_URL } : {}),
        ...(process.env.MAKE_WEBHOOK_SECRET ? { webhookSecret: process.env.MAKE_WEBHOOK_SECRET } : {}),
      }
    case 'notion':
      return {
        ...(process.env.NOTION_API_KEY ? { apiKey: process.env.NOTION_API_KEY } : {}),
        ...(process.env.NOTION_DATABASE_ID ? { databaseId: process.env.NOTION_DATABASE_ID } : {}),
      }
    case 'elevenlabs':
      return {
        ...(process.env.ELEVENLABS_API_KEY ? { apiKey: process.env.ELEVENLABS_API_KEY } : {}),
        ...(process.env.ELEVENLABS_DEFAULT_VOICE_ID ? { voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID } : {}),
      }
    case 'creatomate':
      return {
        ...(process.env.CREATOMATE_API_KEY ? { apiKey: process.env.CREATOMATE_API_KEY } : {}),
        ...(process.env.CREATOMATE_DEFAULT_TEMPLATE_ID ? { templateId: process.env.CREATOMATE_DEFAULT_TEMPLATE_ID } : {}),
      }
    case 'google_oauth':
      return {
        ...(process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
          ? { clientId: (process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)! }
          : {}),
        ...(process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
          ? { clientSecret: (process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)! }
          : {}),
        ...(process.env.YOUTUBE_REFRESH_TOKEN ? { refreshToken: process.env.YOUTUBE_REFRESH_TOKEN } : {}),
      }
    case 'browser_worker':
      return {}
  }
}

/**
 * Resolves plaintext credentials in server/worker memory only.
 * Never call from or return to frontend components.
 */
export async function resolveProviderCredentials(
  userId: string,
  provider: IntegrationProviderId
): Promise<{ enabled: boolean; credentials: Record<string, string>; metadata: Record<string, unknown> }> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID for credential access')
  }

  const envCreds = getEnvCredentialsForProvider(provider)
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('assistant_integrations')
    .select('enabled, encrypted_credentials, config_metadata')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  if (row && row.enabled === false) {
    return { enabled: false, credentials: {}, metadata: row.config_metadata || {} }
  }

  let vaultCreds: Record<string, string> = {}
  if (row?.encrypted_credentials) {
    const jsonText = decryptSecret(row.encrypted_credentials)
    const parsed = JSON.parse(jsonText)
    if (parsed && typeof parsed === 'object') {
      vaultCreds = parsed as Record<string, string>
    }
  }

  return {
    enabled: row?.enabled ?? true,
    credentials: { ...envCreds, ...vaultCreds },
    metadata: (row?.config_metadata as Record<string, unknown>) || {},
  }
}

export async function resolveAICredentials(userId: string): Promise<ResolvedAICredentials> {
  const [openrouter, gemini] = await Promise.all([
    resolveProviderCredentials(userId, 'openrouter').catch(() => ({ enabled: true, credentials: {} as Record<string, string> })),
    resolveProviderCredentials(userId, 'gemini').catch(() => ({ enabled: true, credentials: {} as Record<string, string> })),
  ])

  return {
    openrouterApiKey: openrouter.enabled ? openrouter.credentials.apiKey || process.env.OPENROUTER_API_KEY : undefined,
    openrouterModel: openrouter.credentials.model || process.env.OPENROUTER_PRIMARY_MODEL,
    geminiApiKey: gemini.enabled ? gemini.credentials.apiKey || process.env.GEMINI_API_KEY : undefined,
    groqApiKey: process.env.GROQ_API_KEY,
  }
}

export async function saveIntegrationConfig(opts: {
  userId: string
  provider: IntegrationProviderId
  credentials?: Record<string, string>
  metadata?: Record<string, unknown>
  enabled?: boolean
  disconnect?: boolean
}): Promise<void> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()

  if (opts.disconnect) {
    const { error } = await admin.from('assistant_integrations').upsert(
      {
        user_id: opts.userId,
        provider: opts.provider,
        enabled: false,
        status: 'disconnected',
        encrypted_credentials: null,
        last_error: null,
      },
      { onConflict: 'user_id,provider' }
    )
    if (error) throw new Error(error.message)
    return
  }

  let encryptedEnvelope: string | undefined
  let keyVersion = 'v1'

  if (opts.credentials && Object.keys(opts.credentials).length > 0) {
    if (!isEncryptionConfigured()) {
      throw new Error(
        'Cannot save credentials: ASSISTANT_ENCRYPTION_KEY is missing or not 32 bytes. Configure it in server environment variables first.'
      )
    }

    // Separate secret fields from non-secret display metadata cleanly
    const def = INTEGRATION_CATALOG[opts.provider]
    const cleanSecrets: Record<string, string> = {}
    const safeMeta: Record<string, unknown> = { ...(opts.metadata || {}) }

    for (const [k, rawVal] of Object.entries(opts.credentials)) {
      if (typeof rawVal !== 'string' || rawVal.trim().length === 0) continue
      const fieldDef = def.credentialFields.find((f) => f.key === k)
      cleanSecrets[k] = rawVal.trim()
      if (fieldDef && !fieldDef.secret) {
        safeMeta[k] = rawVal.trim()
      }
    }

    if (Object.keys(cleanSecrets).length > 0) {
      const enc = encryptSecret(JSON.stringify(cleanSecrets))
      encryptedEnvelope = enc.envelope
      keyVersion = enc.keyVersion
    }
    opts.metadata = safeMeta
  }

  const { data: existing } = await admin
    .from('assistant_integrations')
    .select('encrypted_credentials, config_metadata, status')
    .eq('user_id', opts.userId)
    .eq('provider', opts.provider)
    .maybeSingle()

  const nextStatus =
    opts.enabled === false
      ? 'disconnected'
      : encryptedEnvelope || existing?.encrypted_credentials
      ? 'connected'
      : existing?.status || 'unconfigured'

  const { error } = await admin.from('assistant_integrations').upsert(
    {
      user_id: opts.userId,
      provider: opts.provider,
      enabled: opts.enabled ?? true,
      status: nextStatus,
      ...(encryptedEnvelope ? { encrypted_credentials: encryptedEnvelope, key_version: keyVersion } : {}),
      config_metadata: {
        ...((existing?.config_metadata as Record<string, unknown>) || {}),
        ...(opts.metadata || {}),
      },
      last_error: null,
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) throw new Error(error.message)
}

export async function getIntegrationStatusList(userId: string): Promise<IntegrationStatusSummary[]> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()

  const [{ data: rows }, { data: heartbeats }] = await Promise.all([
    admin
      .from('assistant_integrations')
      .select('provider, enabled, status, encrypted_credentials, config_metadata, last_tested_at, last_error')
      .eq('user_id', userId),
    admin
      .from('assistant_worker_heartbeats')
      .select('worker_id, hostname, pid, status, active_jobs, last_heartbeat_at')
      .eq('user_id', userId)
      .order('last_heartbeat_at', { ascending: false })
      .limit(3),
  ])

  const rowMap = new Map((rows || []).map((r) => [r.provider as IntegrationProviderId, r]))
  const latestBeat = (heartbeats || [])[0]
  const workerOnline =
    Boolean(latestBeat?.last_heartbeat_at) &&
    Date.now() - new Date(latestBeat.last_heartbeat_at).getTime() <= 45_000

  return INTEGRATION_PROVIDERS.map((providerId) => {
    const def = INTEGRATION_CATALOG[providerId]
    const dbRow = rowMap.get(providerId)
    const envCreds = getEnvCredentialsForProvider(providerId)
    const hasEnv = Object.keys(envCreds).length > 0
    const hasVault = Boolean(dbRow?.encrypted_credentials)

    if (providerId === 'browser_worker') {
      return {
        provider: 'browser_worker',
        label: def.label,
        description: def.description,
        enabled: dbRow?.enabled ?? true,
        status: workerOnline ? 'connected' : 'disconnected',
        configuredVia: 'none',
        verificationMode: workerOnline ? 'live_verified' : 'worker_offline',
        lastTestedAt: latestBeat?.last_heartbeat_at || dbRow?.last_tested_at || null,
        lastError: workerOnline
          ? null
          : 'No active background worker heartbeat in the last 45 seconds. Start worker/assistant-worker.ts.',
        secretPreview: workerOnline ? `Worker ${latestBeat.worker_id} Online` : 'Worker Offline',
        credentialFields: def.credentialFields,
        metadata: latestBeat
          ? {
              worker_id: latestBeat.worker_id,
              hostname: latestBeat.hostname,
              active_jobs: latestBeat.active_jobs,
              last_heartbeat_at: latestBeat.last_heartbeat_at,
            }
          : {},
      }
    }

    const configuredVia: IntegrationStatusSummary['configuredVia'] =
      hasEnv && hasVault ? 'both' : hasVault ? 'encrypted_vault' : hasEnv ? 'env' : 'none'

    let status: IntegrationStatusSummary['status'] = 'unconfigured'
    if (dbRow?.enabled === false) {
      status = 'disconnected'
    } else if (dbRow?.status === 'error') {
      status = 'error'
    } else if (dbRow?.status === 'connected' || hasEnv || hasVault) {
      status = 'connected'
    }

    const verificationMode: IntegrationStatusSummary['verificationMode'] =
      status === 'connected'
        ? dbRow?.last_tested_at && !dbRow?.last_error
          ? 'live_verified'
          : 'mock_supported'
        : 'awaiting_credentials'

    return {
      provider: providerId,
      label: def.label,
      description: def.description,
      enabled: dbRow?.enabled ?? true,
      status,
      configuredVia,
      verificationMode,
      lastTestedAt: dbRow?.last_tested_at || null,
      lastError: dbRow?.last_error ? redactSecretsInText(dbRow.last_error) : null,
      secretPreview: maskSecretStatus(hasVault || hasEnv),
      credentialFields: def.credentialFields,
      metadata: (dbRow?.config_metadata as Record<string, unknown>) || {},
    }
  })
}

export async function testIntegrationConnection(
  userId: string,
  provider: IntegrationProviderId
): Promise<{
  ok: boolean
  provider: IntegrationProviderId
  status: 'connected' | 'disconnected' | 'unconfigured' | 'error'
  message: string
  details?: Record<string, unknown>
}> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()

  if (provider === 'browser_worker') {
    const { data: beats } = await admin
      .from('assistant_worker_heartbeats')
      .select('*')
      .eq('user_id', userId)
      .order('last_heartbeat_at', { ascending: false })
      .limit(1)

    const beat = beats?.[0]
    const online =
      Boolean(beat?.last_heartbeat_at) &&
      Date.now() - new Date(beat.last_heartbeat_at).getTime() <= 45_000

    await admin.from('assistant_integrations').upsert(
      {
        user_id: userId,
        provider,
        status: online ? 'connected' : 'disconnected',
        last_tested_at: new Date().toISOString(),
        last_error: online ? null : 'Background worker heartbeat not detected within 45 seconds.',
      },
      { onConflict: 'user_id,provider' }
    )

    return {
      ok: online,
      provider,
      status: online ? 'connected' : 'disconnected',
      message: online
        ? `Worker "${beat.worker_id}" is online (last heartbeat ${beat.last_heartbeat_at}).`
        : 'Background worker is offline. Start it via scripts/run-assistant-worker.ps1 or PM2.',
      details: beat || {},
    }
  }

  let resolved: { enabled: boolean; credentials: Record<string, string>; metadata: Record<string, unknown> }
  try {
    resolved = await resolveProviderCredentials(userId, provider)
  } catch (err: any) {
    const msg = redactSecretsInText(err?.message || 'Failed to decrypt credentials')
    return { ok: false, provider, status: 'error', message: msg }
  }

  if (!resolved.enabled) {
    return { ok: false, provider, status: 'disconnected', message: 'Integration is currently disabled by owner.' }
  }

  const creds = resolved.credentials
  let ok = false
  let message = 'Missing required credentials. Supply them to test live connection.'
  let details: Record<string, unknown> = {}

  try {
    switch (provider) {
      case 'openrouter': {
        if (!creds.apiKey) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${creds.apiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        ok = res.ok
        message = res.ok ? 'OpenRouter API key verified.' : `OpenRouter returned HTTP ${res.status}`
        break
      }
      case 'gemini': {
        if (!creds.apiKey) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(creds.apiKey)}`,
          { signal: AbortSignal.timeout(10000) }
        )
        ok = res.ok
        message = res.ok ? 'Google Gemini API key verified.' : `Gemini returned HTTP ${res.status}`
        break
      }
      case 'telegram': {
        if (!creds.botToken) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/getMe`, {
          signal: AbortSignal.timeout(10000),
        })
        const data = await res.json().catch(() => null)
        ok = Boolean(res.ok && data?.ok)
        message = ok
          ? `Telegram bot @${data.result?.username || 'connected'} verified.`
          : `Telegram API error: ${data?.description || res.status}`
        if (ok) details = { username: data.result?.username }
        break
      }
      case 'make': {
        if (!creds.webhookUrl) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        // Validate URL format without triggering unintended side-effect runs on scenario webhook
        const parsed = new URL(creds.webhookUrl)
        ok = /^https:$/i.test(parsed.protocol)
        message = ok
          ? `Make.com HTTPS webhook endpoint configured (${parsed.hostname}). Use a test task to execute an end-to-end scenario ping.`
          : 'Make.com webhook must use HTTPS.'
        break
      }
      case 'notion': {
        if (!creds.apiKey) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            Authorization: `Bearer ${creds.apiKey}`,
            'Notion-Version': '2022-06-28',
          },
          signal: AbortSignal.timeout(10000),
        })
        ok = res.ok
        message = res.ok ? 'Notion API integration verified.' : `Notion returned HTTP ${res.status}`
        break
      }
      case 'elevenlabs': {
        if (!creds.apiKey) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': creds.apiKey },
          signal: AbortSignal.timeout(10000),
        })
        ok = res.ok
        message = res.ok ? 'ElevenLabs API key verified.' : `ElevenLabs returned HTTP ${res.status}`
        break
      }
      case 'creatomate': {
        if (!creds.apiKey) {
          return await persistTestResult(userId, provider, 'unconfigured', message)
        }
        const res = await fetch('https://api.creatomate.com/v1/templates', {
          headers: { Authorization: `Bearer ${creds.apiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        ok = res.ok
        message = res.ok ? 'Creatomate API key verified.' : `Creatomate returned HTTP ${res.status}`
        break
      }
      case 'google_oauth': {
        if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
          return await persistTestResult(
            userId,
            provider,
            'unconfigured',
            'YouTube Client ID, Client Secret, and Refresh Token are required for automated YouTube uploads.'
          )
        }
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            refresh_token: creds.refreshToken,
            grant_type: 'refresh_token',
          }),
          signal: AbortSignal.timeout(10000),
        })
        ok = tokenRes.ok
        message = tokenRes.ok
          ? 'Google OAuth / YouTube token exchange verified.'
          : `Google OAuth returned HTTP ${tokenRes.status}`
        break
      }
    }
  } catch (err: any) {
    ok = false
    message = redactSecretsInText(err?.message || 'Connection test failed')
  }

  return persistTestResult(userId, provider, ok ? 'connected' : 'error', message, details)
}

async function persistTestResult(
  userId: string,
  provider: IntegrationProviderId,
  status: 'connected' | 'disconnected' | 'unconfigured' | 'error',
  message: string,
  details?: Record<string, unknown>
) {
  const admin = createAdminClient()
  const safeMessage = redactSecretsInText(message)
  await admin.from('assistant_integrations').upsert(
    {
      user_id: userId,
      provider,
      status,
      last_tested_at: new Date().toISOString(),
      last_error: status === 'connected' ? null : safeMessage,
    },
    { onConflict: 'user_id,provider' }
  )

  return {
    ok: status === 'connected',
    provider,
    status,
    message: safeMessage,
    details,
  }
}
