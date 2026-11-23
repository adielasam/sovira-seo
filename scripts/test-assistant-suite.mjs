#!/usr/bin/env node
/**
 * Sovira AI Task Assistant — Automated Security, Crypto, Registry & Failover Verification Suite
 *
 * Clearly distinguishes:
 * - REAL MODULE TESTS: Compiles & executes actual TypeScript modules under lib/assistant/.
 * - MOCKED EXTERNAL SERVICE TESTS: Exercises failover & webhook logic without calling live paid APIs.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ROOT = process.cwd()
const DIST_DIR = path.join(ROOT, '.assistant-test-dist')

function compileAssistantModules() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true })
  const tscJs = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tscJs)) {
    throw new Error('TypeScript compiler not found in node_modules. Run pnpm install first.')
  }

  const tmpTsConfig = path.join(ROOT, '.tsconfig.assistant-test.json')
  fs.writeFileSync(
    tmpTsConfig,
    JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: {
          noEmit: false,
          rootDir: '.',
          outDir: '.assistant-test-dist',
          module: 'commonjs',
          moduleResolution: 'node',
        },
        include: [
          'lib/assistant/auth.ts',
          'lib/assistant/crypto.ts',
          'lib/assistant/types.ts',
          'lib/assistant/tools/registry.ts',
          'lib/assistant/ai-provider.ts',
        ],
      },
      null,
      2
    )
  )

  try {
    execFileSync(process.execPath, [tscJs, '-p', tmpTsConfig], { cwd: ROOT, stdio: 'pipe' })
  } finally {
    fs.rmSync(tmpTsConfig, { force: true })
  }
}

function loadCompiledWithSupabaseMock() {
  const req = createRequire(import.meta.url)
  const Module = req('node:module')
  const origResolve = Module._resolveFilename

  let mockUser = { id: 'f6e15a16-757b-4fa6-8b71-56254ebddfc5', email: 'adielasam2015@gmail.com' }

  const mockModulePath = path.join(DIST_DIR, '__mock_supabase_server.js')
  fs.writeFileSync(
    mockModulePath,
    `
    let _mockUser = null;
    exports.__setMockUser = (u) => { _mockUser = u; };
    exports.createClient = async () => ({
      auth: {
        getUser: async () => ({ data: { user: _mockUser }, error: null })
      }
    });
    `
  )

  const supabaseMock = req(mockModulePath)
  supabaseMock.__setMockUser(mockUser)

  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === '@/lib/supabase/server') {
      return mockModulePath
    }
    return origResolve.call(this, request, parent, isMain, options)
  }

  return {
    auth: req(path.join(DIST_DIR, 'lib', 'assistant', 'auth.js')),
    cryptoMod: req(path.join(DIST_DIR, 'lib', 'assistant', 'crypto.js')),
    registry: req(path.join(DIST_DIR, 'lib', 'assistant', 'tools', 'registry.js')),
    aiProvider: req(path.join(DIST_DIR, 'lib', 'assistant', 'ai-provider.js')),
    setMockUser: (u) => supabaseMock.__setMockUser(u),
    restore: () => {
      Module._resolveFilename = origResolve
    },
  }
}

async function runTests() {
  let passed = 0
  let loaded = null

  const test = async (label, fn) => {
    await fn()
    passed += 1
    console.log(`  PASS: ${label}`)
  }

  try {
    console.log('[1/4] Compiling real TypeScript assistant modules...')
    compileAssistantModules()
    loaded = loadCompiledWithSupabaseMock()
    const { auth, cryptoMod, registry, aiProvider, setMockUser } = loaded

    console.log('[2/4] Running REAL Authentication & Timing-Safe Comparison Tests...')
    await test('constantTimeEqual handles mismatched lengths safely without throwing RangeError', async () => {
      assert.equal(auth.constantTimeEqual('short', 'much-longer-secret-string'), false)
      assert.equal(auth.constantTimeEqual('', 'non-empty'), false)
      assert.equal(auth.constantTimeEqual(null, 'abc'), false)
      assert.equal(auth.constantTimeEqual('exact-match-123', 'exact-match-123'), true)
      assert.equal(auth.constantTimeEqual('exact-match-123', 'exact-match-124'), false)
    })

    await test('isExactAssistantOwnerId enforces canonical owner UUID and rejects email strings or other UUIDs', async () => {
      process.env.ASSISTANT_OWNER_USER_ID = 'f6e15a16-757b-4fa6-8b71-56254ebddfc5'
      assert.equal(auth.isExactAssistantOwnerId('f6e15a16-757b-4fa6-8b71-56254ebddfc5'), true)
      assert.equal(auth.isExactAssistantOwnerId('F6E15A16-757B-4FA6-8B71-56254EBDDFC5'), true)
      assert.equal(auth.isExactAssistantOwnerId('00000000-0000-4000-8000-000000000000'), false)
      assert.equal(auth.isExactAssistantOwnerId('adielasam2015@gmail.com'), false)
      assert.equal(auth.isExactAssistantOwnerId(undefined), false)
    })

    await test('requireAssistantOwner returns 401 when unauthenticated, 403 for non-owner, 200 for exact owner UUID', async () => {
      setMockUser(null)
      const unauth = await auth.requireAssistantOwner()
      assert.equal(unauth.authorized, false)
      assert.equal(unauth.status, 401)

      setMockUser({ id: '11111111-1111-4111-8111-111111111111', email: 'adielasam2015@gmail.com' })
      const wrongUuidEvenWithMatchingEmail = await auth.requireAssistantOwner()
      assert.equal(wrongUuidEvenWithMatchingEmail.authorized, false)
      assert.equal(wrongUuidEvenWithMatchingEmail.status, 403)

      setMockUser({ id: 'f6e15a16-757b-4fa6-8b71-56254ebddfc5', email: 'adielasam2015@gmail.com' })
      const ownerRes = await auth.requireAssistantOwner()
      assert.equal(ownerRes.authorized, true)
      assert.equal(ownerRes.userId, 'f6e15a16-757b-4fa6-8b71-56254ebddfc5')
    })

    console.log('[3/4] Running REAL AES-256-GCM Encryption, Key Validation & Rotation Tests...')
    await test('parseAes256Key strictly rejects invalid/short keys', async () => {
      assert.throws(() => cryptoMod.parseAes256Key('too-short'), /expected 32 bytes/)
      assert.throws(() => cryptoMod.parseAes256Key(''), /not configured/)
      const validHex = crypto.randomBytes(32).toString('hex')
      assert.equal(cryptoMod.parseAes256Key(validHex).byteLength, 32)
    })

    await test('encryptSecret rejects masked placeholder text and produces unique IVs + verifiable GCM authTags', async () => {
      const keyV1 = crypto.randomBytes(32).toString('hex')
      process.env.ASSISTANT_ENCRYPTION_KEY = keyV1
      process.env.ASSISTANT_ENCRYPTION_KEY_VERSION = 'v1'
      delete process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS

      assert.throws(() => cryptoMod.encryptSecret('********'), /masked placeholder/)
      assert.throws(() => cryptoMod.encryptSecret('REDACTED'), /masked placeholder/)

      const secretJson = JSON.stringify({ apiKey: 'sk-or-v1-test-secret-key-999' })
      const enc1 = cryptoMod.encryptSecret(secretJson)
      const enc2 = cryptoMod.encryptSecret(secretJson)

      assert.notEqual(enc1.envelope, enc2.envelope)
      assert.equal(cryptoMod.decryptSecret(enc1.envelope), secretJson)

      // Tamper ciphertext segment -> GCM authentication must fail
      const segments = enc1.envelope.split(':')
      segments[3] = Buffer.from('tampered_payload').toString('base64')
      assert.throws(() => cryptoMod.decryptSecret(segments.join(':')))
    })

    await test('rotateEncryptedSecret migrates v1 ciphertexts to v2 key cleanly', async () => {
      const keyV1 = crypto.randomBytes(32).toString('hex')
      process.env.ASSISTANT_ENCRYPTION_KEY = keyV1
      process.env.ASSISTANT_ENCRYPTION_KEY_VERSION = 'v1'
      delete process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS

      const originalPayload = JSON.stringify({ botToken: '123456:TEST_TOKEN' })
      const oldEnc = cryptoMod.encryptSecret(originalPayload)

      // Rotate to v2 keeping v1 in PREVIOUS
      const keyV2 = crypto.randomBytes(32).toString('hex')
      process.env.ASSISTANT_ENCRYPTION_KEY = keyV2
      process.env.ASSISTANT_ENCRYPTION_KEY_VERSION = 'v2'
      process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS = `v1:${keyV1}`

      const rotated = cryptoMod.rotateEncryptedSecret(oldEnc.envelope)
      assert.equal(rotated.keyVersion, 'v2')
      assert.equal(rotated.rotated, true)

      // Drop v1 completely and confirm v2 decrypts cleanly
      delete process.env.ASSISTANT_ENCRYPTION_KEY_PREVIOUS
      assert.equal(cryptoMod.decryptSecret(rotated.envelope), originalPayload)
    })

    await test('redactSecretsInText strips bearer tokens, OpenRouter/Groq/Gemini keys, and URL params', async () => {
      const dirty = 'Failed with Bearer sk-or-v1-abcdef123456 and ?key=AIzaSyDummyKeyValue1234567890'
      const clean = cryptoMod.redactSecretsInText(dirty)
      assert.equal(clean.includes('sk-or-v1-abcdef'), false)
      assert.equal(clean.includes('AIzaSyDummyKey'), false)
      assert.equal(clean.includes('[REDACTED'), true)
    })

    console.log('[4/4] Running Controlled Tool Registry & Mocked Failover Tests...')
    await test('validateTaskPlan enforces tool allow-list and URL safety', async () => {
      const valid = registry.validateTaskPlan({
        summary: 'Research African video tools and sync to Notion.',
        category: 'research',
        riskLevel: 'low',
        approvalRequired: true,
        steps: [
          {
            stepOrder: 1,
            title: 'Research tools',
            description: 'Compare AI video tools',
            toolName: 'ai_research_analysis',
            parameters: { topic: 'African story video tools', outputFormat: 'report' },
            requiresApproval: true,
          },
        ],
      })
      assert.equal(valid.steps.length, 1)

      assert.throws(() =>
        registry.validateTaskPlan({
          summary: 'Bad tool',
          steps: [
            {
              stepOrder: 1,
              title: 'Run shell',
              description: 'Arbitrary command',
              toolName: 'execute_shell_script',
              parameters: {},
            },
          ],
        })
      )

      assert.throws(() =>
        registry.validateTaskPlan({
          summary: 'Bad browser URL',
          steps: [
            {
              stepOrder: 1,
              title: 'Open file URI',
              description: 'Unsafe protocol',
              toolName: 'browser_navigate_extract',
              parameters: { url: 'javascript:alert(1)' },
            },
          ],
        })
      )
    })

    await test('[MOCKED] completeWithFailover invokes mocked OpenRouter and classifies errors cleanly', async () => {
      const origFetch = globalThis.fetch
      globalThis.fetch = async (url) => {
        if (String(url).includes('openrouter.ai')) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Mocked OpenRouter response' } }],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
        throw new Error('Unexpected fetch')
      }

      try {
        const res = await aiProvider.completeWithFailover({
          systemPrompt: 'Test',
          prompt: 'Hello',
          credentials: { openrouterApiKey: 'sk-or-v1-mock-1234567890' },
        })
        assert.equal(res.provider, 'openrouter')
        assert.equal(res.text, 'Mocked OpenRouter response')
        assert.equal(res.usage.totalTokens, 15)

        const authErr = aiProvider.classifyAIError(new Error('Unauthorized'), 401)
        assert.equal(authErr.errorType, 'AUTH_ERROR')
        assert.equal(authErr.retryable, false)

        const rateErr = aiProvider.classifyAIError(new Error('Rate limit'), 429)
        assert.equal(rateErr.errorType, 'RATE_LIMIT')
        assert.equal(rateErr.retryable, true)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    console.log(`\nALL ${passed} TESTS PASSED cleanly (Real crypto/auth/registry + clearly labeled mocked AI tests).`)
  } finally {
    if (loaded) loaded.restore()
    fs.rmSync(DIST_DIR, { recursive: true, force: true })
  }
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err)
  process.exit(1)
})
