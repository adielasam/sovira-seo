import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { constantTimeEqual, getConfiguredOwnerUserId, isExactAssistantOwnerId } from '../auth'
import { redactSecretsInText } from '../crypto'
import { resolveProviderCredentials } from './vault'

export interface TelegramLinkStatus {
  linked: boolean
  telegramUserId: number | null
  telegramUsername: string | null
  verifiedAt: string | null
  pendingTokenExpiresAt: string | null
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value.trim(), 'utf8').digest('hex')
}

export async function getTelegramLinkStatus(userId: string): Promise<TelegramLinkStatus> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()
  const { data } = await admin
    .from('assistant_telegram_links')
    .select('telegram_user_id, telegram_username, verified, verified_at, link_token_hash, token_expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  const pendingValid =
    Boolean(data?.link_token_hash && data?.token_expires_at) &&
    new Date(data!.token_expires_at!).getTime() > Date.now()

  return {
    linked: Boolean(data?.verified && data?.telegram_user_id),
    telegramUserId: data?.telegram_user_id || null,
    telegramUsername: data?.telegram_username || null,
    verifiedAt: data?.verified_at || null,
    pendingTokenExpiresAt: pendingValid ? data!.token_expires_at : null,
  }
}

/**
 * Generates a single-use 5-minute linking code.
 * Only its SHA-256 hash is persisted in PostgreSQL.
 */
export async function createTelegramLinkingToken(userId: string): Promise<{
  code: string
  expiresAt: string
}> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const rawBytes = crypto.randomBytes(8).toString('hex').toUpperCase()
  const code = `SOVIRA-${rawBytes.slice(0, 4)}-${rawBytes.slice(4, 8)}`
  const tokenHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { error } = await admin.from('assistant_telegram_links').upsert(
    {
      user_id: userId,
      link_token_hash: tokenHash,
      token_expires_at: expiresAt,
    },
    { onConflict: 'user_id' }
  )

  if (error) throw new Error(error.message)

  return { code, expiresAt }
}

export async function unlinkTelegramAccount(userId: string): Promise<void> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('assistant_telegram_links')
    .update({
      telegram_user_id: null,
      telegram_chat_id: null,
      telegram_username: null,
      link_token_hash: null,
      token_expires_at: null,
      verified: false,
      verified_at: null,
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function verifyTelegramWebhookSecret(headerSecret: string | null): Promise<boolean> {
  const ownerId = getConfiguredOwnerUserId()
  const resolved = await resolveProviderCredentials(ownerId, 'telegram').catch(() => ({
    enabled: true,
    credentials: {} as Record<string, string>,
  }))
  const expected = resolved.credentials.webhookSecret || process.env.TELEGRAM_WEBHOOK_SECRET || ''
  if (!expected || !headerSecret) return false
  return constantTimeEqual(headerSecret.trim(), expected.trim())
}

export async function isTelegramUserConfiguredAllowed(telegramUserId: number): Promise<boolean> {
  const ownerId = getConfiguredOwnerUserId()
  const resolved = await resolveProviderCredentials(ownerId, 'telegram').catch(() => ({
    enabled: true,
    credentials: {} as Record<string, string>,
  }))
  const allowedRaw = resolved.credentials.allowedUserId || process.env.TELEGRAM_ALLOWED_USER_ID || ''
  if (!allowedRaw.trim()) return false
  return constantTimeEqual(String(telegramUserId), allowedRaw.trim())
}

export async function verifyAndBindTelegramLink(opts: {
  telegramUserId: number
  telegramChatId: number
  telegramUsername?: string
  code: string
}): Promise<{ ok: boolean; message: string }> {
  const ownerId = getConfiguredOwnerUserId()
  const allowed = await isTelegramUserConfiguredAllowed(opts.telegramUserId)
  if (!allowed) {
    return { ok: false, message: 'Forbidden: Telegram user ID does not match TELEGRAM_ALLOWED_USER_ID.' }
  }

  const admin = createAdminClient()
  const { data: linkRow, error } = await admin
    .from('assistant_telegram_links')
    .select('id, link_token_hash, token_expires_at')
    .eq('user_id', ownerId)
    .maybeSingle()

  if (error || !linkRow || !linkRow.link_token_hash || !linkRow.token_expires_at) {
    return { ok: false, message: 'No active linking code exists. Generate one in Sovira Assistant Integrations.' }
  }

  if (new Date(linkRow.token_expires_at).getTime() <= Date.now()) {
    return { ok: false, message: 'Linking code has expired. Generate a fresh code in Sovira.' }
  }

  const incomingHash = sha256Hex(opts.code)
  if (!constantTimeEqual(incomingHash, linkRow.link_token_hash)) {
    return { ok: false, message: 'Invalid linking code.' }
  }

  const { error: updErr } = await admin
    .from('assistant_telegram_links')
    .update({
      telegram_user_id: opts.telegramUserId,
      telegram_chat_id: opts.telegramChatId,
      telegram_username: opts.telegramUsername || null,
      link_token_hash: null, // Consume single-use token immediately
      token_expires_at: null,
      verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq('user_id', ownerId)

  if (updErr) {
    return { ok: false, message: 'Database error while binding Telegram link.' }
  }

  return { ok: true, message: 'Telegram account verified and bound cleanly to your Sovira Assistant.' }
}

export async function assertTelegramUserAuthorized(telegramUserId: number): Promise<boolean> {
  const allowedByEnv = await isTelegramUserConfiguredAllowed(telegramUserId)
  if (!allowedByEnv) return false

  const ownerId = getConfiguredOwnerUserId()
  const admin = createAdminClient()
  const { data } = await admin
    .from('assistant_telegram_links')
    .select('verified, telegram_user_id')
    .eq('user_id', ownerId)
    .maybeSingle()

  return Boolean(data?.verified && data.telegram_user_id === telegramUserId)
}

export async function sendTelegramMessage(opts: {
  userId: string
  chatId?: number
  text: string
  replyMarkup?: Record<string, unknown>
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const resolved = await resolveProviderCredentials(opts.userId, 'telegram')
    if (!resolved.enabled || !resolved.credentials.botToken) {
      return { sent: false, error: 'Telegram bot token not configured or disabled.' }
    }

    let targetChatId = opts.chatId
    if (!targetChatId) {
      const admin = createAdminClient()
      const { data: link } = await admin
        .from('assistant_telegram_links')
        .select('telegram_chat_id, verified')
        .eq('user_id', opts.userId)
        .maybeSingle()
      if (link?.verified && link.telegram_chat_id) {
        targetChatId = link.telegram_chat_id
      }
    }

    if (!targetChatId) {
      return { sent: false, error: 'No verified Telegram chat linked.' }
    }

    const res = await fetch(`https://api.telegram.org/bot${resolved.credentials.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: opts.text.slice(0, 4000),
        parse_mode: 'HTML',
        ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { sent: false, error: redactSecretsInText(errText) }
    }

    return { sent: true }
  } catch (err: any) {
    return { sent: false, error: redactSecretsInText(err?.message || 'Telegram send error') }
  }
}

export async function answerTelegramCallbackQuery(opts: {
  userId: string
  callbackQueryId: string
  text: string
}): Promise<void> {
  try {
    const resolved = await resolveProviderCredentials(opts.userId, 'telegram')
    if (!resolved.enabled || !resolved.credentials.botToken) return
    await fetch(`https://api.telegram.org/bot${resolved.credentials.botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: opts.callbackQueryId,
        text: opts.text.slice(0, 180),
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // Best-effort callback ack
  }
}
