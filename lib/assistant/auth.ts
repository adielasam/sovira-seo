import crypto from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const DEFAULT_ASSISTANT_OWNER_UUID = 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'

const CANONICAL_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates that an input string is a canonical UUID v1-v5.
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_UUID_REGEX.test(value.trim())
}

/**
 * Performs a constant-time UTF-8 buffer comparison.
 * Strictly validates matching non-zero byte lengths before invoking crypto.timingSafeEqual
 * so mismatched inputs never throw RangeError and avoid length side-channels.
 */
export function constantTimeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  if (a.length === 0 || b.length === 0) {
    return false
  }

  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  if (bufA.byteLength === 0 || bufA.byteLength !== bufB.byteLength) {
    // Execute balanced dummy compare on fixed buffer so mismatch still takes constant work
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Resolves and validates the configured authorised single-user Supabase UUID.
 */
export function getConfiguredOwnerUserId(): string {
  const configured = (process.env.ASSISTANT_OWNER_USER_ID || DEFAULT_ASSISTANT_OWNER_UUID).trim().toLowerCase()
  if (!isValidUuid(configured)) {
    throw new Error('ASSISTANT_OWNER_USER_ID is not a valid canonical UUID')
  }
  return configured
}

/**
 * Exact authenticated Supabase user UUID verification.
 * Replaces any email matching with strict UUID equality via constantTimeEqual.
 */
export function isExactAssistantOwnerId(userId?: string | null): boolean {
  if (!isValidUuid(userId)) {
    return false
  }
  const normalizedUser = userId.trim().toLowerCase()
  const ownerId = getConfiguredOwnerUserId()
  return constantTimeEqual(normalizedUser, ownerId)
}

export type OwnerAuthResult =
  | { authorized: true; userId: string; user: User }
  | { authorized: false; status: 401 | 403; error: string }

/**
 * Authenticates the current Supabase session via supabase.auth.getUser()
 * and enforces exact single-owner UUID authorization.
 */
export async function requireAssistantOwner(): Promise<OwnerAuthResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  if (error || !user) {
    return {
      authorized: false,
      status: 401,
      error: 'Authentication required',
    }
  }

  if (!isExactAssistantOwnerId(user.id)) {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Sovira AI Task Assistant is restricted to the authorised owner account.',
    }
  }

  return {
    authorized: true,
    userId: user.id.toLowerCase(),
    user,
  }
}

const rateBuckets = new Map<string, number[]>()

/**
 * Simple server-side sliding-window rate limiter to protect private AI & webhook endpoints.
 */
export function checkAssistantRateLimit(
  bucketKey: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const existing = (rateBuckets.get(bucketKey) || []).filter((ts) => ts > cutoff)

  if (existing.length >= maxRequests) {
    const oldest = existing[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    rateBuckets.set(bucketKey, existing)
    return { allowed: false, retryAfterSeconds }
  }

  existing.push(now)
  rateBuckets.set(bucketKey, existing)
  return { allowed: true, retryAfterSeconds: 0 }
}
