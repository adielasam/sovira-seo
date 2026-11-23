import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { constantTimeEqual } from '../auth'
import { redactSecretsInText, signHmacSha256 } from '../crypto'
import { resolveProviderCredentials } from './vault'

export interface MakeDispatchResult {
  dispatched: boolean
  executionId: string
  statusCode?: number
  waitingExternal: boolean
  responseBody?: unknown
  error?: string
}

export async function dispatchToMakeWebhook(opts: {
  userId: string
  taskId: string
  stepOrder: number
  scenarioName: string
  eventType: string
  payload: Record<string, unknown>
  waitForCallback: boolean
  abortSignal?: AbortSignal
}): Promise<MakeDispatchResult> {
  const executionId = `sov_${opts.taskId}_${opts.stepOrder}_${crypto.randomBytes(6).toString('hex')}`
  const resolved = await resolveProviderCredentials(opts.userId, 'make')

  if (!resolved.enabled) {
    throw new Error('Make.com integration is disabled')
  }

  const webhookUrl = resolved.credentials.webhookUrl
  const webhookSecret = resolved.credentials.webhookSecret

  if (!webhookUrl) {
    throw new Error('MAKE_WEBHOOK_URL is not configured. Supply Make.com webhook credentials first.')
  }

  const bodyObj = {
    executionId,
    taskId: opts.taskId,
    stepOrder: opts.stepOrder,
    scenarioName: opts.scenarioName,
    eventType: opts.eventType,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.sovira.com.ng'}/api/assistant/webhooks/make`,
    payload: opts.payload,
    dispatchedAt: new Date().toISOString(),
  }

  const rawBody = JSON.stringify(bodyObj)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = webhookSecret ? signHmacSha256(webhookSecret, `${timestamp}.${rawBody}`) : ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Sovira-Execution-Id': executionId,
    'X-Sovira-Idempotency-Key': `${opts.taskId}:${opts.stepOrder}`,
    'X-Sovira-Timestamp': timestamp,
  }
  if (signature) {
    headers['X-Sovira-Signature'] = signature
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: rawBody,
    signal: opts.abortSignal || AbortSignal.timeout(20000),
  })

  const text = await res.text().catch(() => '')
  let parsedBody: unknown = text
  try {
    parsedBody = JSON.parse(text)
  } catch {
    // Keep text response
  }

  if (!res.ok) {
    throw new Error(`Make.com webhook failed (HTTP ${res.status}): ${redactSecretsInText(text).slice(0, 300)}`)
  }

  return {
    dispatched: true,
    executionId,
    statusCode: res.status,
    waitingExternal: opts.waitForCallback,
    responseBody: parsedBody,
  }
}

export async function verifyMakeCallbackRequest(opts: {
  userId: string
  rawBody: string
  timestampHeader: string | null
  signatureHeader: string | null
  bearerSecretHeader: string | null
}): Promise<boolean> {
  const resolved = await resolveProviderCredentials(opts.userId, 'make')
  const secret = resolved.credentials.webhookSecret || process.env.MAKE_WEBHOOK_SECRET
  if (!secret || secret.trim().length === 0) {
    return false
  }

  if (opts.signatureHeader && opts.timestampHeader) {
    const expected = signHmacSha256(secret, `${opts.timestampHeader}.${opts.rawBody}`)
    if (constantTimeEqual(opts.signatureHeader.trim().toLowerCase(), expected.toLowerCase())) {
      return true
    }
  }

  if (opts.bearerSecretHeader) {
    if (constantTimeEqual(opts.bearerSecretHeader.trim(), secret.trim())) {
      return true
    }
  }

  return false
}

export async function recordWebhookIdempotency(opts: {
  userId: string
  provider: string
  eventKey: string
  rawPayload: string
}): Promise<{ duplicate: boolean }> {
  const admin = createAdminClient()
  const payloadHash = crypto.createHash('sha256').update(opts.rawPayload, 'utf8').digest('hex')

  const { error } = await admin.from('assistant_webhook_events').insert({
    user_id: opts.userId,
    provider: opts.provider,
    event_key: opts.eventKey,
    payload_hash: payloadHash,
  })

  if (error) {
    // Unique violation 23505 => already processed event
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      return { duplicate: true }
    }
    throw new Error(`Webhook deduplication insert failed: ${error.message}`)
  }

  return { duplicate: false }
}
