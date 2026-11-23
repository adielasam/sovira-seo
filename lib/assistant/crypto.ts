import crypto from 'node:crypto'

const AES_ALGORITHM = 'aes-256-gcm'
const IV_BYTE_LENGTH = 12
const AUTH_TAG_BYTE_LENGTH = 16
const KEY_BYTE_LENGTH = 32

const MASKED_INPUT_REGEX = /^(?:\*{3,}|REDACTED|CONFIGURED|\[\[REDACTED\]\]|••••)/i

/**
 * Parses and strictly validates an AES-256-GCM master key (must decode to exact 32 bytes / 256 bits).
 * Accepts 64-character hex or 44-character standard/URL-safe base64.
 */
export function parseAes256Key(rawKey: string, label = 'ASSISTANT_ENCRYPTION_KEY'): Buffer {
  if (typeof rawKey !== 'string' || rawKey.trim().length === 0) {
    throw new Error(`${label} is not configured`)
  }

  const trimmed = rawKey.trim()
  let keyBuffer: Buffer

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    keyBuffer = Buffer.from(trimmed, 'hex')
  } else {
    // Attempt strict base64 decoding
    keyBuffer = Buffer.from(trimmed, 'base64')
    if (keyBuffer.byteLength !== KEY_BYTE_LENGTH) {
      // Check if raw 32-byte ASCII secret was intentionally supplied (only valid if exact byte length === 32)
      const utf8Buf = Buffer.from(trimmed, 'utf8')
      if (utf8Buf.byteLength === KEY_BYTE_LENGTH) {
        keyBuffer = utf8Buf
      }
    }
  }

  if (keyBuffer.byteLength !== KEY_BYTE_LENGTH) {
    throw new Error(
      `Invalid ${label} length: expected ${KEY_BYTE_LENGTH} bytes (256 bits), got ${keyBuffer.byteLength} bytes`
    )
  }

  return keyBuffer
}

export function getActiveKeyVersion(): string {
  const version = (process.env.ASSISTANT_ENCRYPTION_KEY_VERSION || 'v1').trim()
  if (!/^[a-zA-Z0-9_-]{1,16}$/.test(version) || version.includes(':')) {
    throw new Error('ASSISTANT_ENCRYPTION_KEY_VERSION must be alphanumeric/hyphen/underscore')
  }
  return version
}

/**
 * Builds an in-memory keyring from environment variables only (never from the database).
 */
export function loadEncryptionKeyring(): Map<string, Buffer> {
  const ring = new Map<string, Buffer>()
  const activeVersion = getActiveKeyVersion()

  if (process.env.ASSISTANT_ENCRYPTION_KEY) {
    ring.set(activeVersion, parseAes256Key(process.env.ASSISTANT_ENCRYPTION_KEY, 'ASSISTANT_ENCRYPTION_KEY'))
  }

  const previousRaw = process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS
  if (previousRaw && previousRaw.trim().length > 0) {
    for (const entry of previousRaw.split(',')) {
      const trimmed = entry.trim()
      if (!trimmed) continue
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx <= 0) {
        throw new Error('Invalid ASSISTANT_ENCRYPTION_KEY_PREVIOUS entry: expected "version:key"')
      }
      const ver = trimmed.slice(0, colonIdx).trim()
      const raw = trimmed.slice(colonIdx + 1).trim()
      ring.set(ver, parseAes256Key(raw, `ASSISTANT_ENCRYPTION_KEY_PREVIOUS[${ver}]`))
    }
  }

  return ring
}

export function isEncryptionConfigured(): boolean {
  try {
    if (!process.env.ASSISTANT_ENCRYPTION_KEY) return false
    parseAes256Key(process.env.ASSISTANT_ENCRYPTION_KEY, 'ASSISTANT_ENCRYPTION_KEY')
    return true
  } catch {
    return false
  }
}

/**
 * Rejects placeholder/masked UI strings so masked strings can never masquerade as secrets.
 */
export function assertUnmaskedPlaintextSecret(value: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Credential payload cannot be empty')
  }
  if (MASKED_INPUT_REGEX.test(value.trim())) {
    throw new Error('Refusing to encrypt masked placeholder text as a credential')
  }
}

/**
 * Encrypts plaintext secrets using AES-256-GCM with a unique 12-byte random IV.
 * Envelope format: <keyVersion>:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 */
export function encryptSecret(plaintext: string): { envelope: string; keyVersion: string } {
  assertUnmaskedPlaintextSecret(plaintext)

  const keyVersion = getActiveKeyVersion()
  const key = parseAes256Key(process.env.ASSISTANT_ENCRYPTION_KEY || '', 'ASSISTANT_ENCRYPTION_KEY')
  const iv = crypto.randomBytes(IV_BYTE_LENGTH)

  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  if (authTag.byteLength !== AUTH_TAG_BYTE_LENGTH) {
    throw new Error('Unexpected GCM authentication tag length')
  }

  const envelope = [
    keyVersion,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')

  return { envelope, keyVersion }
}

/**
 * Decrypts an AES-256-GCM envelope using the matching version from the environment keyring.
 */
export function decryptSecret(envelope: string): string {
  if (typeof envelope !== 'string' || !envelope.includes(':')) {
    throw new Error('Invalid encrypted credential envelope format')
  }

  const parts = envelope.split(':')
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted credential envelope: expected 4 colon-separated segments')
  }

  const [keyVersion, ivB64, tagB64, cipherB64] = parts
  const keyring = loadEncryptionKeyring()
  const key = keyring.get(keyVersion)

  if (!key) {
    throw new Error(`Decryption key for version "${keyVersion}" is not loaded in environment keyring`)
  }

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(cipherB64, 'base64')

  if (iv.byteLength !== IV_BYTE_LENGTH) {
    throw new Error(`Invalid GCM IV byte length: ${iv.byteLength}`)
  }
  if (authTag.byteLength !== AUTH_TAG_BYTE_LENGTH) {
    throw new Error(`Invalid GCM auth tag byte length: ${authTag.byteLength}`)
  }

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintextBuf.toString('utf8')
}

/**
 * Re-encrypts an existing credential envelope under the active encryption key and a fresh IV.
 */
export function rotateEncryptedSecret(envelope: string): {
  envelope: string
  keyVersion: string
  rotated: boolean
} {
  const parts = envelope.split(':')
  const currentVersion = getActiveKeyVersion()
  const plaintext = decryptSecret(envelope)
  const reEncrypted = encryptSecret(plaintext)
  return {
    envelope: reEncrypted.envelope,
    keyVersion: reEncrypted.keyVersion,
    rotated: parts[0] !== currentVersion || reEncrypted.envelope !== envelope,
  }
}

/**
 * Produces a non-reversible display label that reveals zero characters of any secret.
 */
export function maskSecretStatus(hasEncryptedSecret: boolean): string {
  return hasEncryptedSecret ? 'Encrypted in Vault (AES-256-GCM)' : 'Not Configured'
}

/**
 * Redacts common bearer tokens, API keys, and URLs with query keys before storing logs or returning errors.
 */
export function redactSecretsInText(input: string): string {
  if (!input) return ''
  return input
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/(sk-or-v1-|sk-[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z\-_]{20,}|AQ\.[A-Za-z0-9\-_]{10,}|secret_[A-Za-z0-9]{10,}|ntn_[A-Za-z0-9]{10,}|xi-[A-Za-z0-9]{10,})/g, '[REDACTED_SECRET]')
    .replace(/(\b\d{7,12}:[A-Za-z0-9_-]{25,}\b)/g, '[REDACTED_TELEGRAM_TOKEN]')
    .replace(/([?&](?:key|token|secret|api_key|access_token)=)[^&\s]+/gi, '$1[REDACTED]')
}

/**
 * Generates an HMAC-SHA256 hex digest for signed webhooks.
 */
export function signHmacSha256(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

/**
 * Generates a cryptographically secure 256-bit hex encryption key for initial setup or rotation.
 */
export function generateNewAes256HexKey(): string {
  return crypto.randomBytes(KEY_BYTE_LENGTH).toString('hex')
}
