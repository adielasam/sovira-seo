#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const VIEWPORT = { width: 1280, height: 800 }
const PROFILE_DIR = path.resolve(process.env.PROFILE_DIR || '/opt/sovira-worker/profiles/default')
const TOKEN_FILE = path.resolve(process.env.WORKER_TOKEN_FILE || '/opt/sovira-worker/token.txt')
const MAX_BODY_BYTES = 1024 * 1024
const HUMAN_TAKEOVER_MAX_MS = 15 * 60 * 1000

function loadWorkerToken() {
  if (process.env.WORKER_TOKEN && process.env.WORKER_TOKEN.trim().length > 0) {
    return process.env.WORKER_TOKEN.trim()
  }
  if (fs.existsSync(TOKEN_FILE)) {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim()
  }
  return ''
}

const WORKER_TOKEN = loadWorkerToken()

function safeTokenEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false
  }
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.byteLength !== bufB.byteLength) {
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

function isAuthorizedRequest(req) {
  if (!WORKER_TOKEN) return false
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return false
  const supplied = auth.slice(7).trim()
  return safeTokenEquals(supplied, WORKER_TOKEN)
}

function clamp(val, min, max) {
  if (!Number.isFinite(val)) return min
  return Math.min(max, Math.max(min, val))
}

function assertSafeHttpUrl(rawUrl) {
  const parsed = new URL(String(rawUrl || ''))
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error(`Disallowed URL protocol: ${parsed.protocol}`)
  }
  return parsed.toString()
}

// Persistent Chromium state & takeover coordinator
let context = null
let launchPromise = null
let openPages = []
let activeTabIndex = 0
let inFlightFramePromise = null

let controlMode = 'idle' // 'idle' | 'agent_running' | 'human_control'
let pauseReason = null
let resumeWaiters = []
let activeRun = null
const runs = new Map()

function recordRun(run) {
  runs.set(run.runId, run)
  if (runs.size > 50) {
    const oldestKey = runs.keys().next().value
    if (oldestKey && (!activeRun || oldestKey !== activeRun.runId)) {
      runs.delete(oldestKey)
    }
  }
}

function summarizeRun(run) {
  if (!run) return null
  return {
    runId: run.runId,
    taskId: run.taskId,
    status: run.status,
    currentStepOrder: run.currentStepOrder,
    startedAt: run.startedAt,
    completedAt: run.completedAt || null,
    error: run.error || null,
  }
}

function wakeResumeWaiters() {
  const pending = resumeWaiters.splice(0, resumeWaiters.length)
  for (const resolve of pending) {
    try {
      resolve()
    } catch {
      // ignore
    }
  }
}

async function waitIfHumanHasControl(run) {
  if (run?.cancelled) {
    throw new Error('CANCELLED_BY_USER')
  }
  while (controlMode === 'human_control') {
    if (run?.cancelled) {
      throw new Error('CANCELLED_BY_USER')
    }
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = resumeWaiters.indexOf(done)
        if (idx >= 0) resumeWaiters.splice(idx, 1)
        if (controlMode === 'human_control') {
          controlMode = activeRun && activeRun.status === 'running' ? 'agent_running' : 'idle'
          pauseReason = 'Human control timeout reached (15 minutes); resuming agent.'
        }
        resolve()
      }, HUMAN_TAKEOVER_MAX_MS)

      const done = () => {
        clearTimeout(timer)
        resolve()
      }
      resumeWaiters.push(done)
    })
  }
  if (run?.cancelled) {
    throw new Error('CANCELLED_BY_USER')
  }
}

function trackPage(page, focus = false) {
  if (!page || openPages.includes(page)) return
  openPages.push(page)
  if (focus) {
    activeTabIndex = openPages.length - 1
  }
  page.setDefaultTimeout(25000)
  page.on('close', () => {
    const idx = openPages.indexOf(page)
    if (idx >= 0) {
      openPages.splice(idx, 1)
      if (activeTabIndex >= openPages.length) {
        activeTabIndex = Math.max(0, openPages.length - 1)
      }
    }
  })
}

async function ensureBrowser() {
  if (context) {
    try {
      const existing = context.pages().filter((p) => !p.isClosed())
      openPages = existing
      if (openPages.length === 0) {
        const blank = await context.newPage()
        trackPage(blank, true)
      }
      if (activeTabIndex >= openPages.length) {
        activeTabIndex = openPages.length - 1
      }
      return context
    } catch {
      context = null
      openPages = []
      activeTabIndex = 0
    }
  }

  if (launchPromise) {
    return launchPromise
  }

  launchPromise = (async () => {
    fs.mkdirSync(PROFILE_DIR, { recursive: true })
    const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: true,
      viewport: VIEWPORT,
      acceptDownloads: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })

    context = ctx
    openPages = []
    for (const p of ctx.pages()) {
      if (!p.isClosed()) trackPage(p, false)
    }
    if (openPages.length === 0) {
      const p = await ctx.newPage()
      trackPage(p, true)
    }

    ctx.on('page', (newPage) => {
      trackPage(newPage, true)
    })

    ctx.on('close', () => {
      context = null
      openPages = []
      activeTabIndex = 0
    })

    return ctx
  })()

  try {
    return await launchPromise
  } finally {
    launchPromise = null
  }
}

async function getActivePage() {
  await ensureBrowser()
  openPages = openPages.filter((p) => !p.isClosed())
  if (openPages.length === 0) {
    const p = await context.newPage()
    trackPage(p, true)
  }
  activeTabIndex = clamp(activeTabIndex, 0, Math.max(0, openPages.length - 1))
  return openPages[activeTabIndex]
}

async function collectTabsMetadata() {
  await ensureBrowser()
  openPages = openPages.filter((p) => !p.isClosed())
  const tabs = await Promise.all(
    openPages.map(async (p, idx) => ({
      index: idx,
      title: await p.title().catch(() => ''),
      url: p.url(),
      active: idx === activeTabIndex,
    }))
  )
  return tabs
}

async function captureJpegFrame(quality = 70) {
  if (inFlightFramePromise) {
    return inFlightFramePromise
  }
  inFlightFramePromise = (async () => {
    const page = await getActivePage()
    return await page.screenshot({ type: 'jpeg', quality, fullPage: false, timeout: 6000 })
  })()
  try {
    return await inFlightFramePromise
  } finally {
    inFlightFramePromise = null
  }
}

async function detectCaptchaOrMfa(page) {
  try {
    return await page.evaluate(() => {
      const url = window.location.href.toLowerCase()
      const title = (document.title || '').toLowerCase()
      const text = (document.body?.innerText || '').slice(0, 8000).toLowerCase()

      const hasCaptcha = Boolean(
        document.querySelector(
          'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], .cf-turnstile, .g-recaptcha, .h-captcha'
        )
      )
      if (hasCaptcha) {
        return 'CAPTCHA / Cloudflare Turnstile detected. Click "Take control of the browser" to solve it, then click Done.'
      }
      if (title.includes('just a moment') || text.includes('verify you are human') || text.includes('checking your browser')) {
        return 'Browser verification gate detected ("verify you are human"). Solve it manually and click Done.'
      }
      if (
        text.includes('two-factor authentication') ||
        text.includes('enter verification code') ||
        text.includes('authenticator app') ||
        text.includes('one-time password') ||
        (url.includes('challenge') && text.includes('verify'))
      ) {
        return 'MFA / 2FA challenge detected. Complete verification manually and click Done.'
      }
      return null
    })
  } catch {
    return null
  }
}

function appendRunLog(run, message, level = 'info', stepOrder = null) {
  run.logs.push({
    timestamp: new Date().toISOString(),
    level,
    stepOrder,
    message,
  })
}

async function pauseForHumanInRun(run, reason, stepOrder) {
  controlMode = 'human_control'
  pauseReason = reason
  appendRunLog(run, `Paused for human takeover: ${reason}`, 'security', stepOrder)
  await waitIfHumanHasControl(run)
  appendRunLog(run, 'Human clicked Done; agent resumed execution from live browser state.', 'audit', stepOrder)
}

async function tryNavigateToLoginPageIfNeeded(page, run, stepOrder) {
  const hasPass = await page.locator('input[type="password"]:visible').count().catch(() => 0)
  if (hasPass > 0) return

  const loginLink = page
    .locator(
      'a:visible:has-text("Login"), a:visible:has-text("Log in"), a:visible:has-text("Sign in"), a:visible:has-text("Student Portal"), a:visible[href*="login"], a:visible[href*="signin"], button:visible:has-text("Login"), button:visible:has-text("Sign in")'
    )
    .first()

  const count = await loginLink.count().catch(() => 0)
  if (count > 0) {
    appendRunLog(run, 'Following visible Login / Sign-In link on page.', 'info', stepOrder)
    await loginLink.click({ timeout: 5000 }).catch(() => {})
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(800)
  }
}

async function findFallbackFillLocator(page, action, usedSelectors) {
  const hint = `${action.selector || ''} ${action.valueKey || ''}`.toLowerCase()
  const val = String(action.value || '')
  const looksLikePassword = /pass|pwd|secret/.test(hint)
  const looksLikeEmail = /email|mail|user|log|name|phone|account/.test(hint) || val.includes('@')

  if (looksLikePassword) {
    return page.locator('input[type="password"]:visible').first()
  }
  if (looksLikeEmail) {
    const emailCandidates = [
      'input[type="email"]:visible',
      'input[name*="email" i]:visible',
      'input[name*="user" i]:visible',
      'input[name="log"]:visible',
      'input[id*="email" i]:visible',
      'input[id*="user" i]:visible',
      'input[type="text"]:visible',
    ]
    for (const sel of emailCandidates) {
      if (usedSelectors.has(sel)) continue
      const loc = page.locator(sel).first()
      if ((await loc.count().catch(() => 0)) > 0) {
        usedSelectors.add(sel)
        return loc
      }
    }
  }
  return page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):visible').first()
}

async function executeSingleAction(page, action, run, stepOrder, usedFillFallback) {
  await waitIfHumanHasControl(run)

  switch (action.type) {
    case 'navigate': {
      if (action.value) {
        const safeUrl = assertSafeHttpUrl(action.value)
        appendRunLog(run, `Navigating browser to ${safeUrl}`, 'info', stepOrder)
        await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(1000)
      }
      break
    }
    case 'fill': {
      await tryNavigateToLoginPageIfNeeded(page, run, stepOrder)
      const val = String(action.value || '')
      let filled = false
      if (action.selector) {
        try {
          const target = page.locator(action.selector).first()
          await target.waitFor({ state: 'visible', timeout: 4000 })
          await target.fill(val, { timeout: 6000 })
          filled = true
          appendRunLog(run, `Populated input "${action.selector}" ([INPUT_REDACTED])`, 'security', stepOrder)
        } catch {
          // Fall through cleanly to smart visible form field resolution
        }
      }
      if (!filled) {
        const fallbackLoc = await findFallbackFillLocator(page, action, usedFillFallback)
        if ((await fallbackLoc.count().catch(() => 0)) > 0) {
          await fallbackLoc.fill(val, { timeout: 8000 })
          appendRunLog(run, 'Populated visible form input via smart field fallback ([INPUT_REDACTED])', 'security', stepOrder)
        } else {
          appendRunLog(run, `Could not find visible input matching "${action.selector || 'fill'}"`, 'warn', stepOrder)
        }
      }
      break
    }
    case 'click': {
      let clicked = false
      if (action.selector) {
        try {
          const target = page.locator(action.selector).first()
          await target.waitFor({ state: 'visible', timeout: 4000 })
          await target.click({ timeout: 6000 })
          clicked = true
          appendRunLog(run, `Clicked element "${action.selector}"`, 'info', stepOrder)
        } catch {
          // Fall through cleanly to visible submit/action fallback
        }
      }
      if (!clicked) {
        const submitCandidates = [
          'button[type="submit"]:visible',
          'input[type="submit"]:visible',
          'button:visible:has-text("Sign in")',
          'button:visible:has-text("Sign In")',
          'button:visible:has-text("Log in")',
          'button:visible:has-text("Login")',
          'button:visible:has-text("Continue")',
          'button:visible:has-text("Submit")',
        ]
        for (const sel of submitCandidates) {
          const loc = page.locator(sel).first()
          if ((await loc.count().catch(() => 0)) > 0) {
            await loc.click({ timeout: 6000 })
            clicked = true
            appendRunLog(run, `Clicked fallback submit button (${sel})`, 'info', stepOrder)
            break
          }
        }
        if (!clicked) {
          appendRunLog(run, `Target clickable element "${action.selector || 'submit'}" not found on page.`, 'warn', stepOrder)
        }
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {})
      await page.waitForTimeout(1500)
      break
    }
    case 'select': {
      if (action.selector && action.value) {
        await page.locator(action.selector).first().selectOption(String(action.value), { timeout: 10000 })
        appendRunLog(run, `Selected option on "${action.selector}"`, 'info', stepOrder)
      }
      break
    }
    case 'wait': {
      const ms = clamp(Number(action.value || 1500), 250, 10000)
      await page.waitForTimeout(ms)
      break
    }
    case 'screenshot': {
      appendRunLog(run, 'Captured intermediate live Chromium screenshot.', 'info', stepOrder)
      break
    }
    default:
      break
  }

  await waitIfHumanHasControl(run)
  const gate = await detectCaptchaOrMfa(page)
  if (gate) {
    await pauseForHumanInRun(run, gate, stepOrder)
  }
}

async function extractRenderedDomSnapshot(page, extractSelector) {
  return await page.evaluate((sel) => {
    const pickText = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim()
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
      .map(pickText)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 25)

    const navigationLinks = Array.from(document.querySelectorAll('nav a[href], aside a[href], header a[href], a[href]'))
      .map((a) => ({
        text: pickText(a).slice(0, 80),
        href: a.href,
      }))
      .filter((l) => l.text && l.href && !l.href.startsWith('javascript:'))
      .slice(0, 30)

    const cards = Array.from(
      document.querySelectorAll('[class*="card"], [class*="widget"], [class*="stat"], [class*="course"], main section, table')
    )
      .map((el) => pickText(el).slice(0, 320))
      .filter((t) => t.length >= 10)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 25)

    const loginErrors = Array.from(
      document.querySelectorAll('#login_error, .login-error, .alert-danger, .error-message, [role="alert"]')
    )
      .map((el) => pickText(el).slice(0, 300))
      .filter(Boolean)

    const hasPasswordField = Boolean(document.querySelector('input[type="password"]:visible'))
    const rawTarget = sel ? document.querySelector(sel) : document.body
    const extractedText = pickText(rawTarget).slice(0, 6000)

    return {
      finalUrl: window.location.href,
      pageTitle: document.title || '',
      extractedText,
      structuredSnapshot: {
        headings,
        navigationLinks,
        dashboardCardsAndMetrics: cards,
        loginErrors,
        hasPasswordField,
      },
    }
  }, extractSelector || null)
}

async function executeRemoteRun(run, steps) {
  activeRun = run
  controlMode = 'agent_running'
  pauseReason = null

  try {
    const page = await getActivePage()
    appendRunLog(run, `Started live cloud browser execution (${steps.length} step(s)).`, 'audit')

    for (const step of steps) {
      await waitIfHumanHasControl(run)
      run.currentStepOrder = step.stepOrder

      const params = step.parameters || {}
      if (params.url) {
        const targetUrl = assertSafeHttpUrl(params.url)
        if (page.url() !== targetUrl) {
          appendRunLog(run, `Navigating to ${targetUrl}`, 'info', step.stepOrder)
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await page.waitForTimeout(1200)
        }
      }

      await waitIfHumanHasControl(run)
      const initialGate = await detectCaptchaOrMfa(page)
      if (initialGate) {
        await pauseForHumanInRun(run, initialGate, step.stepOrder)
      }

      const usedFillFallback = new Set()
      if (Array.isArray(params.actions)) {
        for (const action of params.actions) {
          await executeSingleAction(page, action, run, step.stepOrder, usedFillFallback)
        }
      }

      await waitIfHumanHasControl(run)
      await page.waitForTimeout(1200)

      const domSnap = await extractRenderedDomSnapshot(
        page,
        typeof params.extractSelector === 'string' ? params.extractSelector : null
      )

      const jpgBuf = await page.screenshot({ type: 'jpeg', quality: 65, fullPage: false, timeout: 6000 }).catch(() => null)
      const screenshotBase64 = jpgBuf ? `data:image/jpeg;base64,${jpgBuf.toString('base64')}` : undefined

      const isLoginStillShowing = domSnap.structuredSnapshot.hasPasswordField
      const stepOut = {
        step: step.stepOrder,
        tool: step.toolName,
        success: true,
        executionEngine: 'live_cloud_playwright',
        pausedForHumanVerification: false,
        authenticatedLikely: !isLoginStillShowing && !domSnap.structuredSnapshot.loginErrors.length,
        ...domSnap,
        screenshotBase64,
        downloadedFiles: [],
      }

      run.stepResults.push(stepOut)
      appendRunLog(run, `Completed step ${step.stepOrder} on ${domSnap.finalUrl}`, 'info', step.stepOrder)
    }

    run.status = 'completed'
    run.completedAt = new Date().toISOString()
    appendRunLog(run, 'All live browser steps completed cleanly.', 'audit')
  } catch (err) {
    if (err?.message === 'CANCELLED_BY_USER' || run.cancelled) {
      run.status = 'cancelled'
      run.error = 'Cancelled cleanly by owner.'
      appendRunLog(run, run.error, 'warn')
    } else {
      run.status = 'failed'
      run.error = String(err?.message || err || 'Live browser execution failed')
      appendRunLog(run, `Run failed: ${run.error}`, 'error')
    }
    run.completedAt = new Date().toISOString()
  } finally {
    if (activeRun?.runId === run.runId) {
      activeRun = null
    }
    if (controlMode !== 'human_control') {
      controlMode = 'idle'
      pauseReason = null
    }
  }
}

function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
  })
  res.end(json)
}

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON request body'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = urlObj.pathname

  try {
    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        liveBrowser: true,
        controlMode,
        pauseReason,
        activeRunId: activeRun?.runId || null,
        queue: activeRun ? 1 : 0,
        active: activeRun?.runId || null,
      })
    }

    if (!WORKER_TOKEN) {
      return sendJson(res, 503, { error: 'WORKER_TOKEN is not configured on worker server.' })
    }

    if (!isAuthorizedRequest(req)) {
      return sendJson(res, 401, { error: 'Unauthorized worker bearer token' })
    }

    if (req.method === 'GET' && pathname === '/session/state') {
      const tabs = await collectTabsMetadata()
      return sendJson(res, 200, {
        ok: true,
        liveBrowser: true,
        controlMode,
        pauseReason,
        viewport: VIEWPORT,
        activeTabIndex,
        tabs,
        activeRun: summarizeRun(activeRun),
      })
    }

    if (req.method === 'GET' && pathname === '/session/frame') {
      const jpg = await captureJpegFrame(70)
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpg.byteLength),
        'Cache-Control': 'no-store, max-age=0',
      })
      return res.end(jpg)
    }

    if (req.method === 'POST' && pathname === '/session/takeover') {
      const body = await readJsonBody(req)
      controlMode = 'human_control'
      pauseReason =
        typeof body.reason === 'string' && body.reason.trim()
          ? body.reason.trim().slice(0, 300)
          : 'Owner clicked "Take control of the browser".'
      await ensureBrowser()
      return sendJson(res, 200, { ok: true, controlMode, pauseReason })
    }

    if (req.method === 'POST' && pathname === '/session/release') {
      pauseReason = null
      controlMode = activeRun && activeRun.status === 'running' ? 'agent_running' : 'idle'
      wakeResumeWaiters()
      return sendJson(res, 200, { ok: true, controlMode, pauseReason })
    }

    if (req.method === 'POST' && pathname === '/session/input') {
      const body = await readJsonBody(req)
      const page = await getActivePage()

      switch (body.type) {
        case 'click': {
          const x = clamp(Number(body.x), 0, VIEWPORT.width)
          const y = clamp(Number(body.y), 0, VIEWPORT.height)
          const button = ['left', 'right', 'middle'].includes(body.button) ? body.button : 'left'
          const clickCount = clamp(Number(body.clickCount || 1), 1, 3)
          await page.mouse.click(x, y, { button, clickCount })
          break
        }
        case 'wheel': {
          await page.mouse.wheel(clamp(Number(body.deltaX || 0), -2000, 2000), clamp(Number(body.deltaY || 0), -2000, 2000))
          break
        }
        case 'type': {
          if (typeof body.text === 'string' && body.text.length > 0) {
            await page.keyboard.type(body.text.slice(0, 2000), { delay: 12 })
          }
          break
        }
        case 'key': {
          if (typeof body.key === 'string' && body.key.length > 0 && body.key.length <= 40) {
            await page.keyboard.press(body.key)
          }
          break
        }
        case 'navigate': {
          const safeUrl = assertSafeHttpUrl(body.url)
          await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
          break
        }
        case 'back': {
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
          break
        }
        case 'forward': {
          await page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
          break
        }
        case 'reload': {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null)
          break
        }
        case 'new_tab': {
          const ctx = await ensureBrowser()
          const p = await ctx.newPage()
          trackPage(p, true)
          if (body.url && /^https?:\/\//i.test(String(body.url))) {
            await p.goto(assertSafeHttpUrl(body.url), { waitUntil: 'domcontentloaded', timeout: 30000 })
          }
          break
        }
        case 'switch_tab': {
          openPages = openPages.filter((p) => !p.isClosed())
          if (openPages.length > 0) {
            activeTabIndex = clamp(Number(body.index || 0), 0, openPages.length - 1)
            await openPages[activeTabIndex].bringToFront().catch(() => {})
          }
          break
        }
        case 'close_tab': {
          openPages = openPages.filter((p) => !p.isClosed())
          if (openPages.length > 0) {
            const idx = clamp(Number(body.index ?? activeTabIndex), 0, openPages.length - 1)
            const target = openPages[idx]
            if (openPages.length === 1) {
              const replacement = await context.newPage()
              trackPage(replacement, true)
            }
            await target.close().catch(() => {})
          }
          break
        }
        default:
          return sendJson(res, 400, { error: `Unsupported input type: ${String(body.type)}` })
      }

      const tabs = await collectTabsMetadata()
      return sendJson(res, 200, { ok: true, activeTabIndex, tabs })
    }

    if (req.method === 'POST' && pathname === '/session/run-task') {
      const body = await readJsonBody(req)
      const runId = String(body.runId || crypto.randomUUID())
      const taskId = String(body.taskId || runId)
      const steps = Array.isArray(body.steps) ? body.steps : []

      const existing = runs.get(runId)
      if (existing && existing.status === 'running') {
        return sendJson(res, 202, { ok: true, accepted: true, runId, deduplicated: true })
      }

      if (activeRun && activeRun.status === 'running') {
        return sendJson(res, 409, { error: `Worker is already executing run ${activeRun.runId}` })
      }

      const run = {
        runId,
        taskId,
        status: 'running',
        currentStepOrder: 1,
        logs: [],
        stepResults: [],
        cancelled: false,
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null,
      }
      recordRun(run)

      setImmediate(() => {
        executeRemoteRun(run, steps).catch(() => {})
      })

      return sendJson(res, 202, { ok: true, accepted: true, runId })
    }

    if (req.method === 'GET' && pathname.startsWith('/session/run-status/')) {
      const runId = decodeURIComponent(pathname.slice('/session/run-status/'.length))
      const run = runs.get(runId)
      if (!run) {
        return sendJson(res, 404, { error: `Run ${runId} not found` })
      }
      return sendJson(res, 200, {
        ok: true,
        controlMode,
        pauseReason,
        run: {
          runId: run.runId,
          taskId: run.taskId,
          status: run.status,
          controlMode,
          pauseReason,
          currentStepOrder: run.currentStepOrder,
          logs: run.logs,
          stepResults: run.stepResults,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          error: run.error,
        },
      })
    }

    if (req.method === 'POST' && pathname === '/session/cancel-run') {
      const body = await readJsonBody(req)
      const targetRun = body.runId ? runs.get(String(body.runId)) : activeRun
      if (targetRun) {
        targetRun.cancelled = true
        targetRun.status = 'cancelled'
        targetRun.completedAt = new Date().toISOString()
        targetRun.error = 'Cancelled cleanly by owner.'
      }
      if (controlMode === 'human_control') {
        controlMode = 'idle'
        pauseReason = null
      }
      wakeResumeWaiters()
      return sendJson(res, 200, { ok: true, cancelled: Boolean(targetRun) })
    }

    return sendJson(res, 404, { error: 'Endpoint not found' })
  } catch (err) {
    return sendJson(res, 500, { error: err?.message || 'Internal worker server error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[Sovira Live Browser] Listening on http://${HOST}:${PORT} (profile=${PROFILE_DIR})`)
})

const shutdown = async () => {
  wakeResumeWaiters()
  if (context) {
    await context.close().catch(() => {})
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
