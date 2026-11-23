#!/usr/bin/env node
/**
 * Sovira AI Task Assistant — AES-256-GCM Key Rotation & Recovery Script
 *
 * Procedure:
 * 1. Move current ASSISTANT_ENCRYPTION_KEY to ASSISTANT_ENCRYPTION_KEY_PREVIOUS="<old_ver>:<old_key>"
 * 2. Generate new 256-bit key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 3. Set ASSISTANT_ENCRYPTION_KEY="<new_key>" and increment ASSISTANT_ENCRYPTION_KEY_VERSION="v2"
 * 4. Run dry-run first: node scripts/rotate-assistant-keys.mjs --dry-run
 * 5. Apply rotation: node scripts/rotate-assistant-keys.mjs --apply
 * 6. After verifying connected integrations still test cleanly, remove old key from PREVIOUS.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

function parseAes256Key(rawKey, label) {
  const trimmed = (rawKey || '').trim()
  if (!trimmed) throw new Error(`${label} is missing`)
  let buf
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    buf = Buffer.from(trimmed, 'hex')
  } else {
    buf = Buffer.from(trimmed, 'base64')
    if (buf.byteLength !== 32) {
      const utf8 = Buffer.from(trimmed, 'utf8')
      if (utf8.byteLength === 32) buf = utf8
    }
  }
  if (buf.byteLength !== 32) {
    throw new Error(`${label} must decode to exactly 32 bytes (got ${buf.byteLength})`)
  }
  return buf
}

function buildKeyring() {
  const activeVersion = (process.env.ASSISTANT_ENCRYPTION_KEY_VERSION || 'v1').trim()
  const ring = new Map()
  ring.set(activeVersion, parseAes256Key(process.env.ASSISTANT_ENCRYPTION_KEY, 'ASSISTANT_ENCRYPTION_KEY'))

  const prev = process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS || ''
  for (const item of prev.split(',')) {
    const t = item.trim()
    if (!t) continue
    const idx = t.indexOf(':')
    if (idx <= 0) throw new Error('Invalid ASSISTANT_ENCRYPTION_KEY_PREVIOUS entry')
    const ver = t.slice(0, idx).trim()
    const keyRaw = t.slice(idx + 1).trim()
    ring.set(ver, parseAes256Key(keyRaw, `ASSISTANT_ENCRYPTION_KEY_PREVIOUS[${ver}]`))
  }
  return { activeVersion, ring }
}

function decryptWithRing(envelope, ring) {
  const parts = envelope.split(':')
  if (parts.length !== 4) throw new Error('Malformed encrypted envelope')
  const [ver, ivB64, tagB64, cipherB64] = parts
  const key = ring.get(ver)
  if (!key) throw new Error(`Missing key version "${ver}" in keyring`)
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const cipher = Buffer.from(cipherB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8')
}

function encryptWithActive(plaintext, activeVersion, activeKey) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', activeKey, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${activeVersion}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

async function main() {
  loadEnvLocal()
  const apply = process.argv.includes('--apply')
  const { activeVersion, ring } = buildKeyring()
  const activeKey = ring.get(activeVersion)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ownerId = process.env.ASSISTANT_OWNER_USER_ID || 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  const listRes = await fetch(
    `${supabaseUrl}/rest/v1/assistant_integrations?user_id=eq.${encodeURIComponent(ownerId)}&select=id,provider,key_version,encrypted_credentials`,
    { headers }
  )
  if (!listRes.ok) {
    console.error('Failed to query assistant_integrations:', await listRes.text())
    process.exit(1)
  }

  const rows = await listRes.json()
  console.log(`Found ${rows.length} integration rows for owner ${ownerId}. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`)

  for (const row of rows) {
    if (!row.encrypted_credentials) {
      console.log(`- ${row.provider}: no encrypted credentials stored (skipped)`)
      continue
    }
    const plaintext = decryptWithRing(row.encrypted_credentials, ring)
    const nextEnvelope = encryptWithActive(plaintext, activeVersion, activeKey)
    if (!apply) {
      console.log(`- ${row.provider}: verified decrypt (${row.key_version}) -> ready for re-encrypt (${activeVersion})`)
      continue
    }

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/assistant_integrations?id=eq.${encodeURIComponent(row.id)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          encrypted_credentials: nextEnvelope,
          key_version: activeVersion,
        }),
      }
    )
    if (!patchRes.ok) {
      console.error(`- ${row.provider}: failed update:`, await patchRes.text())
      process.exit(1)
    }
    console.log(`- ${row.provider}: rotated from ${row.key_version} -> ${activeVersion}`)
  }

  console.log('Key rotation check finished cleanly.')
}

main().catch((err) => {
  console.error('Key rotation failed:', err.message)
  process.exit(1)
})
