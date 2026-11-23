import * as cheerio from 'cheerio'

export interface WebSessionAction {
  type: string
  selector?: string
  valueKey?: string
  value?: string
}

export interface WebSessionOptions {
  url: string
  actions?: WebSessionAction[]
  extractSelector?: string
  resolvedValues?: Record<string, string>
  abortSignal?: AbortSignal
  pauseOnAuthOrCaptcha?: boolean
  onLog?: (message: string, level?: 'info' | 'warn' | 'error' | 'security') => Promise<void>
}

export interface WebSessionSnapshot {
  headings: string[]
  navigationLinks: Array<{ text: string; href: string }>
  dashboardCardsAndMetrics: string[]
  loginErrors: string[]
  discoveredScripts: string[]
  discoveredRoutes: string[]
  backendAuthFindings: string[]
  formCount: number
  hasPasswordField: boolean
  detectedPlatform: string
}

export interface WebSessionResult {
  success: boolean
  executionEngine: 'serverless_web_session'
  pausedForHumanVerification: boolean
  pauseReason?: string
  finalUrl: string
  httpStatus: number
  pageTitle: string
  loginAttempted: boolean
  authenticatedLikely: boolean
  extractedText: string
  structuredSnapshot: WebSessionSnapshot
  downloadedFiles: string[]
  error?: string
}

interface FetchPageResult {
  response: Response
  html: string
  finalUrl: string
}

interface JsAuthDiscoveryResult {
  explicitAuthSucceeded: boolean
  discoveredScripts: string[]
  discoveredRoutes: string[]
  backendAuthFindings: string[]
  loginErrors: string[]
  apiDataSummaries: string[]
  supabaseAccessToken?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  discoveredTables: string[]
  apiRedirectUrl?: string
}

interface CachedOriginSession {
  lastDashboardUrl: string
  lastHtml: string
  lastStatus: number
  authSummary: string[]
  authenticated: boolean
  cookies: Array<[string, string]>
  timestamp: number
}

const ORIGIN_SESSION_CACHE = new Map<string, CachedOriginSession>()
const CACHE_TTL_MS = 120_000

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

class InMemoryCookieJar {
  private readonly cookies = new Map<string, string>()

  set(name: string, value: string) {
    if (!name) return
    if (value === 'deleted' || value === '') {
      this.cookies.delete(name)
      return
    }
    this.cookies.set(name, value)
  }

  loadEntries(entries: Array<[string, string]>) {
    for (const [k, v] of entries) {
      this.cookies.set(k, v)
    }
  }

  entries(): Array<[string, string]> {
    return Array.from(this.cookies.entries())
  }

  captureFromResponse(res: Response) {
    const rawList: string[] = []
    const headersAny = res.headers as unknown as { getSetCookie?: () => string[] }
    if (typeof headersAny.getSetCookie === 'function') {
      rawList.push(...headersAny.getSetCookie())
    } else {
      const single = res.headers.get('set-cookie')
      if (single) {
        rawList.push(...single.split(/,(?=\s*[^;=,\s]+=)/g))
      }
    }

    for (const raw of rawList) {
      const firstPair = raw.split(';')[0]?.trim()
      if (!firstPair) continue
      const eq = firstPair.indexOf('=')
      if (eq <= 0) continue
      const name = firstPair.slice(0, eq).trim()
      const value = firstPair.slice(eq + 1).trim()
      if (raw.toLowerCase().includes('max-age=0')) {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }
  }

  toHeaderString(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }

  size(): number {
    return this.cookies.size
  }
}

function assertSafeHttpUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl)
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`)
  }
  return parsed.toString()
}

function combineRequestSignals(timeoutMs: number, abortSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!abortSignal) return timeout
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeout, abortSignal])
  }
  return abortSignal
}

async function fetchWithCookies(
  jar: InMemoryCookieJar,
  targetUrl: string,
  opts: {
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
    body?: string
    abortSignal?: AbortSignal
    maxRedirects?: number
    timeoutMs?: number
  } = {}
): Promise<FetchPageResult> {
  let currentUrl = assertSafeHttpUrl(targetUrl)
  let currentMethod: 'GET' | 'POST' = opts.method || 'GET'
  let currentBody = opts.body
  const maxRedirects = opts.maxRedirects ?? 10
  let currentReferer = opts.headers?.Referer

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const cookieHeader = jar.toHeaderString()
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...(opts.headers || {}),
    }

    if (cookieHeader) headers.Cookie = cookieHeader
    if (currentReferer) headers.Referer = currentReferer
    if (currentMethod === 'GET') {
      delete headers['Content-Type']
      delete headers.Origin
    }

    const res = await fetch(currentUrl, {
      method: currentMethod,
      headers,
      body: currentMethod === 'POST' ? currentBody : undefined,
      redirect: 'manual',
      signal: combineRequestSignals(opts.timeoutMs ?? 20000, opts.abortSignal),
    })

    jar.captureFromResponse(res)

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) {
        const html = await res.text().catch(() => '')
        return { response: res, html, finalUrl: currentUrl }
      }
      const nextUrl = assertSafeHttpUrl(new URL(location, currentUrl).toString())
      currentReferer = currentUrl
      currentUrl = nextUrl
      if (res.status === 301 || res.status === 302 || res.status === 303) {
        currentMethod = 'GET'
        currentBody = undefined
      }
      continue
    }

    const html = await res.text().catch(() => '')
    return { response: res, html, finalUrl: currentUrl }
  }

  throw new Error(`Exceeded maximum redirect hops (${maxRedirects}) on ${targetUrl}`)
}

function isNotFoundHtml(html: string, status: number): boolean {
  if (status >= 400) return true
  const lowerTitle = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').toLowerCase()
  return /\b404\b|not[_\s-]found|page doesn['’]t exist/i.test(lowerTitle)
}

function detectBotOrCaptchaGate($: cheerio.CheerioAPI, html: string, httpStatus: number): string | null {
  const title = $('title').text().toLowerCase()
  const lowerHtml = html.toLowerCase()

  if (
    title.includes('just a moment') ||
    lowerHtml.includes('cf-browser-verification') ||
    lowerHtml.includes('challenges.cloudflare.com/turnstile') ||
    lowerHtml.includes('class="cf-turnstile"') ||
    (httpStatus === 403 && lowerHtml.includes('cloudflare'))
  ) {
    return 'Detected Cloudflare / anti-bot Turnstile verification gate.'
  }

  if (
    $('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha').length > 0 ||
    lowerHtml.includes('verify you are human')
  ) {
    return 'Detected CAPTCHA / human verification challenge on this page.'
  }

  return null
}

function detectPlatform($: cheerio.CheerioAPI, html: string): string {
  const lower = html.toLowerCase()
  if (lower.includes('supabase.co')) return 'Static HTML + Client JS (Supabase)'
  if (lower.includes('firebase') || lower.includes('identitytoolkit')) return 'Static HTML + Client JS (Firebase)'
  if (lower.includes('wp-content') || lower.includes('wp-login.php') || lower.includes('wp-admin')) {
    if (lower.includes('learndash') || lower.includes('ld-')) return 'WordPress / LearnDash'
    if (lower.includes('tutor')) return 'WordPress / Tutor LMS'
    if (lower.includes('woocommerce')) return 'WordPress / WooCommerce'
    return 'WordPress'
  }
  if ($('input[name="_token"]').length > 0 || lower.includes('laravel')) return 'Laravel / Blade'
  if (lower.includes('__next_data__')) return 'Next.js'
  if ($('#root, #app').length > 0 && $('body').text().trim().length < 200) return 'Client-Rendered SPA (JS Required)'
  return 'Standard / Static HTML Web App'
}

function findLoginForm($: cheerio.CheerioAPI): cheerio.Cheerio<any> | null {
  let bestForm: cheerio.Cheerio<any> | null = null
  $('form').each((_, el) => {
    const $form = $(el)
    if ($form.find('input[type="password"]').length > 0 && !bestForm) {
      bestForm = $form
    }
  })
  if (bestForm) return bestForm

  $('form').each((_, el) => {
    const $form = $(el)
    const attrs = `${$form.attr('action') || ''} ${$form.attr('id') || ''} ${$form.attr('class') || ''}`.toLowerCase()
    if ((attrs.includes('login') || attrs.includes('signin') || attrs.includes('auth')) && !bestForm) {
      bestForm = $form
    }
  })

  return bestForm
}

function findBestLoginLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const candidates: Array<{ score: number; url: string }> = []
  const seen = new Set<string>()

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim()
    const text = ($(el).text() || '').trim().toLowerCase()
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return

    let absUrl: string
    try {
      absUrl = assertSafeHttpUrl(new URL(href, baseUrl).toString())
    } catch {
      return
    }
    if (seen.has(absUrl)) return
    seen.add(absUrl)

    const lowerHref = absUrl.toLowerCase()
    let score = 0
    if (/login\.html|signin\.html|wp-login\.php|\/login\b|\/signin\b|\/sign-in\b/.test(lowerHref)) score += 12
    if (/login|sign in|signin|log in|student portal|member login/.test(text)) score += 8
    if (/portal|dashboard|my-account|account|auth|student/.test(lowerHref)) score += 4
    if (score > 0) {
      candidates.push({ score, url: absUrl })
    }
  })

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((c) => c.url)
}

function findPostLoginDashboardLink($: cheerio.CheerioAPI, currentUrl: string): string | null {
  const origin = new URL(currentUrl).origin
  let best: { score: number; url: string } | null = null

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim()
    const text = ($(el).text() || '').trim().toLowerCase()
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

    let abs: string
    try {
      abs = assertSafeHttpUrl(new URL(href, currentUrl).toString())
    } catch {
      return
    }
    if (new URL(abs).origin !== origin) return

    const lower = abs.toLowerCase()
    let score = 0
    if (/dashboard\.html|student-dashboard\.html|portal\.html|\/dashboard\b|\/wp-admin\b|\/portal\b/.test(lower)) {
      score += 12
    }
    if (/my-account|account|courses|overview|profile|admin/.test(lower)) score += 6
    if (/dashboard|my courses|student area|overview/.test(text)) score += 6
    if (/logout|log-out|signout/.test(lower)) score = 0

    if (score > 0 && (!best || score > best.score)) {
      best = { score, url: abs }
    }
  })

  return best ? (best as { score: number; url: string }).url : null
}

function extractCredentialPair(fillActions: Array<{ selector?: string; value: string }>): {
  email?: string
  password?: string
} {
  let email: string | undefined
  let password: string | undefined

  for (const act of fillActions) {
    const sel = (act.selector || '').toLowerCase()
    if (!password && /pass|pwd|secret/.test(sel)) {
      password = act.value
      continue
    }
    if (!email && (/email|mail|user|log|name/.test(sel) || act.value.includes('@'))) {
      email = act.value
      continue
    }
  }

  for (const act of fillActions) {
    if (!email && act.value !== password) {
      email = act.value
    } else if (!password && act.value !== email) {
      password = act.value
    }
  }

  return { email, password }
}

function buildFormSubmissionPayload(
  $: cheerio.CheerioAPI,
  $form: cheerio.Cheerio<any>,
  fillActions: Array<{ selector?: string; value: string }>
): { payload: URLSearchParams; populatedFields: string[] } {
  const payload = new URLSearchParams()
  const populatedFields: string[] = []
  const usedFillIndices = new Set<number>()

  $form.find('input').each((_, el) => {
    const $input = $(el)
    const name = $input.attr('name')
    if (!name) return
    const type = ($input.attr('type') || 'text').toLowerCase()
    if (type === 'hidden') {
      payload.set(name, $input.attr('value') ?? '')
    } else if ((type === 'checkbox' || type === 'radio') && $input.is('[checked]')) {
      payload.set(name, $input.attr('value') ?? 'on')
    }
  })

  const $submit = $form.find('input[type="submit"][name], button[type="submit"][name], button[name]').first()
  const submitName = $submit.attr('name')
  if (submitName) {
    payload.set(submitName, $submit.attr('value') ?? $submit.text().trim() ?? '1')
  }

  fillActions.forEach((act, idx) => {
    if (!act.selector) return
    try {
      const $matched = $form.find(act.selector).first()
      const fieldName = $matched.attr('name')
      if (fieldName) {
        payload.set(fieldName, act.value)
        populatedFields.push(fieldName)
        usedFillIndices.add(idx)
      }
    } catch {
      // Invalid CSS selector handled cleanly below
    }
  })

  const remainingFills = fillActions
    .map((act, idx) => ({ act, idx }))
    .filter(({ idx }) => !usedFillIndices.has(idx))

  if (remainingFills.length > 0) {
    const passwordFieldName = $form.find('input[type="password"][name]').first().attr('name')

    let usernameFieldName: string | undefined
    $form.find('input[name]').each((_, el) => {
      if (usernameFieldName) return
      const $el = $(el)
      const type = ($el.attr('type') || 'text').toLowerCase()
      const name = $el.attr('name') || ''
      if (['hidden', 'password', 'submit', 'button', 'checkbox', 'radio'].includes(type)) return
      if (type === 'email' || /user|email|log|login|name|phone|account/i.test(name) || type === 'text') {
        usernameFieldName = name
      }
    })

    for (const { act } of remainingFills) {
      const selHint = (act.selector || '').toLowerCase()
      const looksLikePassword = /pass|pwd|secret/.test(selHint)
      const looksLikeUser = /user|email|mail|log|name/.test(selHint) || act.value.includes('@')

      if (looksLikePassword && passwordFieldName && !populatedFields.includes(passwordFieldName)) {
        payload.set(passwordFieldName, act.value)
        populatedFields.push(passwordFieldName)
      } else if (looksLikeUser && usernameFieldName && !populatedFields.includes(usernameFieldName)) {
        payload.set(usernameFieldName, act.value)
        populatedFields.push(usernameFieldName)
      } else if (usernameFieldName && !populatedFields.includes(usernameFieldName) && !looksLikePassword) {
        payload.set(usernameFieldName, act.value)
        populatedFields.push(usernameFieldName)
      } else if (passwordFieldName && !populatedFields.includes(passwordFieldName)) {
        payload.set(passwordFieldName, act.value)
        populatedFields.push(passwordFieldName)
      }
    }
  }

  return { payload, populatedFields }
}

async function collectSameOriginScripts(
  html: string,
  pageUrl: string,
  abortSignal?: AbortSignal
): Promise<{ combinedText: string; scriptUrls: string[] }> {
  const $ = cheerio.load(html)
  const origin = new URL(pageUrl).origin
  const inlineParts: string[] = [html]
  const scriptUrls: string[] = []

  $('script:not([src])').each((_, el) => {
    const txt = $(el).html()
    if (txt && txt.trim()) inlineParts.push(txt)
  })

  const candidateSrcs: string[] = []
  $('script[src]').each((_, el) => {
    if (candidateSrcs.length >= 6) return
    const src = ($(el).attr('src') || '').trim()
    if (!src) return
    try {
      const abs = assertSafeHttpUrl(new URL(src, pageUrl).toString())
      if (new URL(abs).origin === origin && !candidateSrcs.includes(abs)) {
        candidateSrcs.push(abs)
      }
    } catch {
      // Ignore invalid script URLs
    }
  })

  for (const scriptUrl of candidateSrcs) {
    if (abortSignal?.aborted) break
    try {
      const res = await fetch(scriptUrl, {
        headers: DEFAULT_HEADERS,
        signal: combineRequestSignals(8000, abortSignal),
      })
      if (res.ok) {
        const jsText = (await res.text()).slice(0, 250_000)
        inlineParts.push(jsText)
        scriptUrls.push(scriptUrl)
      }
    } catch {
      // Skip failing individual script fetches safely
    }
  }

  return {
    combinedText: inlineParts.join('\n\n'),
    scriptUrls,
  }
}

function discoverRoutesAndTablesFromScripts(
  sourceText: string,
  baseUrl: string
): {
  routes: string[]
  tables: string[]
  supabaseUrl?: string
  supabaseAnonKey?: string
  firebaseApiKey?: string
  jsonLoginEndpoints: string[]
} {
  const origin = new URL(baseUrl).origin
  const routeScores = new Map<string, number>()

  const addCandidateRoute = (raw: string, baseScore: number) => {
    const trimmed = raw.trim()
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('mailto:') ||
      /\.(?:css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|map)(?:\?|$)/i.test(trimmed)
    ) {
      return
    }
    try {
      const abs = assertSafeHttpUrl(new URL(trimmed, baseUrl).toString())
      if (new URL(abs).origin !== origin) return
      const lower = abs.toLowerCase()
      if (/\/(?:login|signin|sign-in|register|signup|logout)(?:\.html)?$/i.test(lower)) return
      routeScores.set(abs, Math.max(routeScores.get(abs) ?? 0, baseScore))
    } catch {
      // Ignore invalid relative expressions
    }
  }

  // 1. Explicit JS window.location / router redirects
  const locRegex =
    /(?:(?:window\.|document\.)?location(?:\.href)?\s*=\s*|location\.(?:replace|assign)\s*\(\s*)['"]([^'"`\s]+)['"]/gi
  for (const match of sourceText.matchAll(locRegex)) {
    addCandidateRoute(match[1], 20)
  }

  // 2. Quoted dashboard/portal HTML pages or clean routes referenced in scripts
  const htmlRouteRegex =
    /['"]((?:\.?\/)?[a-zA-Z0-9_/-]*(?:dashboard|portal|student|admin|course|courses|home|account|profile|overview)[a-zA-Z0-9_/-]*\.html(?:\?[^'"]*)?)['"]/gi
  for (const match of sourceText.matchAll(htmlRouteRegex)) {
    addCandidateRoute(match[1], 14)
  }

  const cleanRouteRegex = /['"](\/(?:dashboard|portal|student|admin|courses|account|overview)(?:\/[a-zA-Z0-9_-]+)*)['"]/gi
  for (const match of sourceText.matchAll(cleanRouteRegex)) {
    addCandidateRoute(match[1], 10)
  }

  // 3. Supabase URL, anon JWT, and .from('table') calls
  const supabaseUrlMatch = sourceText.match(/https:\/\/[a-z0-9]{12,30}\.supabase\.co/i)
  const jwtMatches = sourceText.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []
  const supabaseAnonKey = jwtMatches.find((tok) => tok.length > 80) || jwtMatches[0]

  const tables: string[] = []
  for (const m of sourceText.matchAll(/\.from\(\s*['"]([a-zA-Z0-9_]{2,64})['"]\s*\)/g)) {
    if (!tables.includes(m[1])) tables.push(m[1])
  }

  // 4. Firebase web apiKey (AIza...) if Firebase auth patterns exist
  const hasFirebaseCue = /firebase|identitytoolkit|signInWithEmailAndPassword|firebaseapp\.com/i.test(sourceText)
  const firebaseKeyMatch = hasFirebaseCue ? sourceText.match(/AIza[0-9A-Za-z\-_]{30,45}/) : null

  // 5. Custom JSON API login endpoints in fetch / axios
  const jsonLoginEndpoints: string[] = []
  const apiRegex =
    /(?:fetch|axios\.post)\(\s*['"]([^'"]*?(?:login|signin|sign-in|auth\/token|authenticate)[^'"]*)['"]/gi
  for (const match of sourceText.matchAll(apiRegex)) {
    try {
      const abs = assertSafeHttpUrl(new URL(match[1], baseUrl).toString())
      if (!/\.html?(?:\?|$)/i.test(abs) && !jsonLoginEndpoints.includes(abs)) {
        jsonLoginEndpoints.push(abs)
      }
    } catch {
      // Ignore template strings
    }
  }

  const routes = Array.from(routeScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([u]) => u)

  return {
    routes,
    tables: tables.slice(0, 8),
    supabaseUrl: supabaseUrlMatch?.[0],
    supabaseAnonKey,
    firebaseApiKey: firebaseKeyMatch?.[0],
    jsonLoginEndpoints: jsonLoginEndpoints.slice(0, 4),
  }
}

async function querySupabaseTablesSafely(opts: {
  supabaseUrl: string
  anonKey: string
  accessToken: string
  tables: string[]
  alreadyQueried: Set<string>
  abortSignal?: AbortSignal
}): Promise<string[]> {
  const summaries: string[] = []
  for (const table of opts.tables.slice(0, 5)) {
    if (opts.alreadyQueried.has(table) || opts.abortSignal?.aborted) continue
    opts.alreadyQueried.add(table)
    try {
      const res = await fetch(`${opts.supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=15`, {
        headers: {
          apikey: opts.anonKey,
          Authorization: `Bearer ${opts.accessToken}`,
        },
        signal: combineRequestSignals(8000, opts.abortSignal),
      })
      if (res.ok) {
        const rows = await res.json().catch(() => null)
        if (Array.isArray(rows)) {
          const preview = JSON.stringify(rows).slice(0, 900)
          summaries.push(`Supabase table "${table}" (${rows.length} row(s) accessible): ${preview}`)
        }
      }
    } catch {
      // Ignore individual table errors / RLS rejections
    }
  }
  return summaries
}

async function analyzeScriptsAndExecuteJsLogin(opts: {
  loginPageUrl: string
  loginHtml: string
  extraSeedHtml?: string
  credentials: { email?: string; password?: string }
  jar: InMemoryCookieJar
  abortSignal?: AbortSignal
  onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'security') => Promise<void>
}): Promise<JsAuthDiscoveryResult> {
  const result: JsAuthDiscoveryResult = {
    explicitAuthSucceeded: false,
    discoveredScripts: [],
    discoveredRoutes: [],
    backendAuthFindings: [],
    loginErrors: [],
    apiDataSummaries: [],
    discoveredTables: [],
  }

  const collected = await collectSameOriginScripts(opts.loginHtml, opts.loginPageUrl, opts.abortSignal)
  let combinedSource = `${collected.combinedText}\n${opts.extraSeedHtml || ''}`
  result.discoveredScripts = collected.scriptUrls

  const discovery = discoverRoutesAndTablesFromScripts(combinedSource, opts.loginPageUrl)
  result.discoveredRoutes = discovery.routes
  result.discoveredTables = discovery.tables
  result.supabaseUrl = discovery.supabaseUrl
  result.supabaseAnonKey = discovery.supabaseAnonKey

  if (discovery.routes.length > 0) {
    result.backendAuthFindings.push(`Discovered client-side target routes: ${discovery.routes.join(', ')}`)
  }

  const { email, password } = opts.credentials

  // A. Supabase Auth in client JS
  if (discovery.supabaseUrl && discovery.supabaseAnonKey) {
    result.backendAuthFindings.push(`Detected Supabase Auth client (${discovery.supabaseUrl})`)
    if (email && password) {
      await opts.onLog(
        `Detected Supabase client auth on ${discovery.supabaseUrl}; authenticating via /auth/v1/token ([INPUT_REDACTED]).`,
        'security'
      )
      try {
        const authRes = await fetch(`${discovery.supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            apikey: discovery.supabaseAnonKey,
            Authorization: `Bearer ${discovery.supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          signal: combineRequestSignals(12000, opts.abortSignal),
        })
        const authData = await authRes.json().catch(() => null)
        if (authRes.ok && authData?.access_token) {
          result.explicitAuthSucceeded = true
          result.supabaseAccessToken = String(authData.access_token)
          const role = authData.user?.user_metadata?.role || authData.user?.role || 'authenticated'
          const userSummary = `Supabase login succeeded (role=${role}, userId=${String(authData.user?.id || 'verified')}).`
          result.backendAuthFindings.push(userSummary)
          await opts.onLog(userSummary, 'info')
        } else {
          const errMsg = authData?.error_description || authData?.msg || `HTTP ${authRes.status}`
          result.loginErrors.push(`Supabase Auth rejected login: ${errMsg}`)
          result.backendAuthFindings.push(`Supabase Auth returned error: ${errMsg}`)
        }
      } catch (err: any) {
        result.loginErrors.push(`Supabase Auth request failed: ${err?.message || 'network error'}`)
      }
    }
  }

  // B. Firebase Auth in client JS
  if (!result.explicitAuthSucceeded && discovery.firebaseApiKey) {
    result.backendAuthFindings.push('Detected Firebase Auth configuration in client scripts.')
    if (email && password) {
      await opts.onLog('Detected Firebase Auth; attempting signInWithPassword ([INPUT_REDACTED]).', 'security')
      try {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(discovery.firebaseApiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
            signal: combineRequestSignals(12000, opts.abortSignal),
          }
        )
        const fbData = await fbRes.json().catch(() => null)
        if (fbRes.ok && fbData?.idToken) {
          result.explicitAuthSucceeded = true
          result.backendAuthFindings.push(`Firebase Auth login succeeded (localId=${String(fbData.localId || 'verified')}).`)
        } else {
          const fbErr = fbData?.error?.message || `HTTP ${fbRes.status}`
          result.loginErrors.push(`Firebase Auth rejected login: ${fbErr}`)
        }
      } catch (err: any) {
        result.loginErrors.push(`Firebase Auth request failed: ${err?.message || 'network error'}`)
      }
    }
  }

  // C. Custom JSON API login endpoint in client JS
  if (!result.explicitAuthSucceeded && discovery.jsonLoginEndpoints.length > 0 && email && password) {
    for (const endpoint of discovery.jsonLoginEndpoints) {
      await opts.onLog(`Attempting discovered JSON API login endpoint ${endpoint} ([INPUT_REDACTED]).`, 'security')
      try {
        const apiRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: new URL(opts.loginPageUrl).origin,
            Referer: opts.loginPageUrl,
            ...(opts.jar.toHeaderString() ? { Cookie: opts.jar.toHeaderString() } : {}),
          },
          body: JSON.stringify({ email, username: email, password }),
          signal: combineRequestSignals(12000, opts.abortSignal),
        })
        opts.jar.captureFromResponse(apiRes)
        const apiJson = await apiRes.json().catch(() => null)
        if (apiRes.ok) {
          result.explicitAuthSucceeded = true
          if (typeof apiJson?.redirect === 'string') result.apiRedirectUrl = apiJson.redirect
          if (typeof apiJson?.redirectUrl === 'string') result.apiRedirectUrl = apiJson.redirectUrl
          result.backendAuthFindings.push(`Custom API login succeeded on ${endpoint} (HTTP ${apiRes.status}).`)
          break
        } else if (apiJson?.message || apiJson?.error) {
          result.loginErrors.push(`API login ${endpoint}: ${apiJson.message || apiJson.error}`)
        }
      } catch {
        // Continue to next candidate
      }
    }
  }

  return result
}

function extractSnapshot(
  html: string,
  finalUrl: string,
  httpStatus: number,
  options: {
    explicitAuthSucceeded: boolean
    extractSelector?: string
    jsDiscovery?: JsAuthDiscoveryResult
  }
): { pageTitle: string; extractedText: string; authenticatedLikely: boolean; snapshot: WebSessionSnapshot } {
  const $ = cheerio.load(html)
  const pageTitle = $('title').first().text().replace(/\s+/g, ' ').trim()
  const detectedPlatform = detectPlatform($, html)
  const formCount = $('form').length
  const hasPasswordField = $('input[type="password"]').length > 0

  const loginErrors: string[] = [...(options.jsDiscovery?.loginErrors || [])]
  $('#login_error, .login-error, .alert-danger, .woocommerce-error, .error-message, [role="alert"]').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim()
    if (txt && txt.length < 400 && !loginErrors.includes(txt)) {
      loginErrors.push(txt)
    }
  })

  const headings: string[] = []
  $('h1, h2, h3, h4').each((_, el) => {
    if (headings.length >= 25) return
    const txt = $(el).text().replace(/\s+/g, ' ').trim()
    if (txt && !headings.includes(txt)) headings.push(txt)
  })

  const navigationLinks: Array<{ text: string; href: string }> = []
  const seenNav = new Set<string>()
  $('nav a[href], aside a[href], header a[href], .menu a[href], .sidebar a[href], .dashboard a[href], a[href]').each(
    (_, el) => {
      if (navigationLinks.length >= 30) return
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      const href = ($(el).attr('href') || '').trim()
      if (!text || !href || href === '#' || href.startsWith('javascript:')) return
      let absHref = href
      try {
        absHref = new URL(href, finalUrl).toString()
      } catch {
        // Keep original
      }
      const key = `${text}|${absHref}`
      if (!seenNav.has(key)) {
        seenNav.add(key)
        navigationLinks.push({ text: text.slice(0, 80), href: absHref })
      }
    }
  )

  const dashboardCardsAndMetrics: string[] = [...(options.jsDiscovery?.apiDataSummaries || [])]
  $('[class*="card"], [class*="widget"], [class*="stat"], [class*="metric"], [class*="course"], [class*="summary"], main section, table').each(
    (_, el) => {
      if (dashboardCardsAndMetrics.length >= 25) return
      const txt = $(el).text().replace(/\s+/g, ' ').trim()
      if (txt && txt.length >= 10) {
        const truncated = txt.slice(0, 320)
        if (!dashboardCardsAndMetrics.includes(truncated)) {
          dashboardCardsAndMetrics.push(truncated)
        }
      }
    }
  )

  const hasLogoutIndicator =
    $('a[href*="logout"], a[href*="log-out"], a[href*="signout"], button:contains("Logout"), button:contains("Log out")').length > 0

  $('script, style, noscript, svg').remove()
  const rawExtract = options.extractSelector ? $(options.extractSelector).first().text() : $('body').text()
  const cleanedText = (rawExtract || '').replace(/\s+/g, ' ').trim()

  const isErrorPage =
    httpStatus >= 400 ||
    /\b404\b|not[_\s-]found|page doesn['’]t exist|cannot get \//i.test(`${pageTitle} ${headings.join(' ')}`)

  const authenticatedLikely =
    !isErrorPage &&
    (options.explicitAuthSucceeded ||
      (loginErrors.length === 0 &&
        !hasPasswordField &&
        (hasLogoutIndicator ||
          /dashboard|my account|enrolled courses|welcome back|my profile/i.test(
            `${pageTitle} ${finalUrl} ${cleanedText.slice(0, 1500)}`
          ))))

  const apiSupplement =
    options.jsDiscovery && options.jsDiscovery.apiDataSummaries.length > 0
      ? `\n\n[Authenticated Data Summary]\n${options.jsDiscovery.apiDataSummaries.join('\n')}`
      : ''

  return {
    pageTitle,
    extractedText: `${cleanedText.slice(0, 5200)}${apiSupplement}`.slice(0, 6000),
    authenticatedLikely,
    snapshot: {
      headings,
      navigationLinks,
      dashboardCardsAndMetrics,
      loginErrors,
      discoveredScripts: options.jsDiscovery?.discoveredScripts || [],
      discoveredRoutes: options.jsDiscovery?.discoveredRoutes || [],
      backendAuthFindings: options.jsDiscovery?.backendAuthFindings || [],
      formCount,
      hasPasswordField,
      detectedPlatform,
    },
  }
}

export async function runServerlessWebSession(opts: WebSessionOptions): Promise<WebSessionResult> {
  const log = async (msg: string, level: 'info' | 'warn' | 'error' | 'security' = 'info') => {
    if (opts.onLog) await opts.onLog(msg, level)
  }

  const origin = new URL(assertSafeHttpUrl(opts.url)).origin
  const jar = new InMemoryCookieJar()
  const cachedOrigin = ORIGIN_SESSION_CACHE.get(origin)
  if (cachedOrigin && Date.now() - cachedOrigin.timestamp < CACHE_TTL_MS && cachedOrigin.cookies.length > 0) {
    jar.loadEntries(cachedOrigin.cookies)
  }

  const actions = opts.actions || []
  const fillActions = actions
    .filter((a) => a.type === 'fill')
    .map((a) => ({
      selector: a.selector,
      value: (a.valueKey && opts.resolvedValues ? opts.resolvedValues[a.valueKey] : a.value) ?? '',
    }))
    .filter((a) => a.value.length > 0)

  const hasExplicitLogin = fillActions.length > 0
  let loginAttempted = false
  let explicitAuthSucceeded = false
  let jsDiscovery: JsAuthDiscoveryResult | undefined

  await log(`Opening serverless HTTP session for ${opts.url}`)
  let current = await fetchWithCookies(jar, opts.url, { abortSignal: opts.abortSignal })
  let seedHtml = current.html

  // Auto-recover if a non-login follow-up step hits a guessed 404 route (e.g. /dashboard -> /dashboard.html or cached URL)
  if (!hasExplicitLogin && isNotFoundHtml(current.html, current.response.status)) {
    const cleanPath = opts.url.replace(/\/+$/, '')
    const candidates: string[] = []
    if (!/\.html?(?:\?|$)/i.test(cleanPath)) {
      candidates.push(`${cleanPath}.html`)
    }
    if (cachedOrigin && Date.now() - cachedOrigin.timestamp < CACHE_TTL_MS && cachedOrigin.lastDashboardUrl) {
      candidates.push(cachedOrigin.lastDashboardUrl)
    }
    candidates.push(
      `${origin}/dashboard.html`,
      `${origin}/student-dashboard.html`,
      `${origin}/portal.html`,
      `${origin}/admin.html`,
      `${origin}/courses.html`,
      `${origin}/index.html`
    )

    for (const altUrl of Array.from(new Set(candidates))) {
      if (opts.abortSignal?.aborted) break
      try {
        const probe = await fetchWithCookies(jar, altUrl, { abortSignal: opts.abortSignal })
        if (!isNotFoundHtml(probe.html, probe.response.status)) {
          await log(`Recovered from 404 on ${opts.url} -> loaded working route ${probe.finalUrl}`)
          current = probe
          break
        }
      } catch {
        // Try next candidate
      }
    }
  }

  let $ = cheerio.load(current.html)

  if (opts.pauseOnAuthOrCaptcha !== false) {
    const gate = detectBotOrCaptchaGate($, current.html, current.response.status)
    if (gate) {
      await log(`Paused cleanly on anti-bot gate: ${gate}`, 'security')
      const snap = extractSnapshot(current.html, current.finalUrl, current.response.status, {
        explicitAuthSucceeded: false,
        extractSelector: opts.extractSelector,
      })
      return {
        success: false,
        executionEngine: 'serverless_web_session',
        pausedForHumanVerification: true,
        pauseReason: `${gate} Start the desktop Playwright worker in non-headless mode to complete human verification manually.`,
        finalUrl: current.finalUrl,
        httpStatus: current.response.status,
        pageTitle: snap.pageTitle,
        loginAttempted: false,
        authenticatedLikely: false,
        extractedText: snap.extractedText,
        structuredSnapshot: snap.snapshot,
        downloadedFiles: [],
      }
    }
  }

  const preNavigate = actions.find((a) => a.type === 'navigate' && a.value && /^https?:\/\//i.test(a.value))
  if (preNavigate?.value && !findLoginForm($)) {
    await log(`Following planned navigation URL ${preNavigate.value}`)
    const navPage = await fetchWithCookies(jar, preNavigate.value, { abortSignal: opts.abortSignal })
    if (!isNotFoundHtml(navPage.html, navPage.response.status)) {
      current = navPage
      $ = cheerio.load(current.html)
    }
  }

  if (hasExplicitLogin) {
    let $loginForm = findLoginForm($)

    if (!$loginForm) {
      const discoveredLinks = findBestLoginLinks($, current.finalUrl)
      const fallbackPaths = [
        `${origin}/login.html`,
        `${origin}/login`,
        `${origin}/wp-login.php`,
        `${origin}/my-account/`,
        `${origin}/signin`,
        `${origin}/signin.html`,
        `${origin}/dashboard.html`,
        `${origin}/portal.html`,
      ]
      for (const candidateUrl of Array.from(new Set([...discoveredLinks, ...fallbackPaths]))) {
        if (opts.abortSignal?.aborted) throw new Error('CANCELLED_BY_USER')
        try {
          const probe = await fetchWithCookies(jar, candidateUrl, { abortSignal: opts.abortSignal })
          if (!isNotFoundHtml(probe.html, probe.response.status)) {
            const $probe = cheerio.load(probe.html)
            const formFound = findLoginForm($probe)
            if (formFound) {
              await log(`Located login form on ${probe.finalUrl}`)
              current = probe
              $ = $probe
              $loginForm = formFound
              break
            }
          }
        } catch {
          // Continue probing next login candidate
        }
      }
    }

    const savedLoginPage = current
    let triedTraditionalPost = false
    let traditionalPostSucceeded = false

    if ($loginForm) {
      const rawActionAttr = ($loginForm.attr('action') || '').trim()
      const formActionUrl = rawActionAttr
        ? assertSafeHttpUrl(new URL(rawActionAttr, current.finalUrl).toString())
        : current.finalUrl
      const formMethod = (($loginForm.attr('method') || 'POST').trim().toUpperCase() === 'GET' ? 'GET' : 'POST') as
        | 'GET'
        | 'POST'

      const isStaticOrJsForm =
        !rawActionAttr ||
        rawActionAttr.startsWith('#') ||
        /^javascript:/i.test(rawActionAttr) ||
        (/\.html?(\?|$)/i.test(formActionUrl) && formActionUrl === current.finalUrl)

      if (!isStaticOrJsForm) {
        triedTraditionalPost = true
        if (formActionUrl.includes('wp-login.php') || current.html.includes('wp-login.php')) {
          jar.set('wordpress_test_cookie', 'WP+Cookie+check')
        }

        const { payload, populatedFields } = buildFormSubmissionPayload($, $loginForm, fillActions)
        for (const fieldName of populatedFields) {
          await log(`Populating form field "${fieldName}" ([INPUT_REDACTED])`, 'security')
        }

        loginAttempted = true
        await log(`Submitting ${formMethod} authentication form to ${formActionUrl} (${jar.size()} cookie(s) in jar)`)

        const postResult =
          formMethod === 'GET'
            ? await fetchWithCookies(
                jar,
                (() => {
                  const target = new URL(formActionUrl)
                  payload.forEach((v, k) => target.searchParams.set(k, v))
                  return target.toString()
                })(),
                { abortSignal: opts.abortSignal }
              )
            : await fetchWithCookies(jar, formActionUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Origin: origin,
                  Referer: current.finalUrl,
                },
                body: payload.toString(),
                abortSignal: opts.abortSignal,
              })

        // Preserve original login page HTML if static server returns HTTP 405 Method Not Allowed or 404
        if (postResult.response.status === 405 || postResult.response.status === 404) {
          await log(
            `Form POST to ${formActionUrl} returned HTTP ${postResult.response.status}; restoring login page HTML to run client-side JS / API login discovery.`,
            'warn'
          )
          current = savedLoginPage
          $ = cheerio.load(current.html)
        } else {
          current = postResult
          $ = cheerio.load(current.html)
          if (postResult.finalUrl !== savedLoginPage.finalUrl || jar.size() > 0) {
            traditionalPostSucceeded = true
            explicitAuthSucceeded = true
          }
        }
      }
    }

    // If traditional form POST wasn't applicable (static .html / JS form) or hit 405, run script & API discovery
    if (!triedTraditionalPost || !traditionalPostSucceeded) {
      loginAttempted = true
      const creds = extractCredentialPair(fillActions)
      jsDiscovery = await analyzeScriptsAndExecuteJsLogin({
        loginPageUrl: savedLoginPage.finalUrl,
        loginHtml: savedLoginPage.html,
        extraSeedHtml: seedHtml,
        credentials: creds,
        jar,
        abortSignal: opts.abortSignal,
        onLog: log,
      })

      if (jsDiscovery.explicitAuthSucceeded) {
        explicitAuthSucceeded = true
      }

      // Probe post-login dashboard candidates discovered from JS redirects / links / common .html filenames
      const candidateDashboards = Array.from(
        new Set([
          ...(jsDiscovery.apiRedirectUrl
            ? [assertSafeHttpUrl(new URL(jsDiscovery.apiRedirectUrl, savedLoginPage.finalUrl).toString())]
            : []),
          ...jsDiscovery.discoveredRoutes,
          ...(findPostLoginDashboardLink($, savedLoginPage.finalUrl)
            ? [findPostLoginDashboardLink($, savedLoginPage.finalUrl)!]
            : []),
          `${origin}/dashboard.html`,
          `${origin}/student-dashboard.html`,
          `${origin}/portal.html`,
          `${origin}/admin.html`,
          `${origin}/courses.html`,
        ])
      ).filter((u) => u !== savedLoginPage.finalUrl)

      for (const dashUrl of candidateDashboards) {
        if (opts.abortSignal?.aborted) break
        try {
          const dashPage = await fetchWithCookies(jar, dashUrl, { abortSignal: opts.abortSignal })
          if (!isNotFoundHtml(dashPage.html, dashPage.response.status)) {
            await log(`Loaded post-login page candidate ${dashPage.finalUrl} (HTTP ${dashPage.response.status})`)
            current = dashPage
            $ = cheerio.load(current.html)

            // Also scan scripts on the landed dashboard page for extra Supabase tables & widget structure
            const dashScripts = await collectSameOriginScripts(current.html, current.finalUrl, opts.abortSignal)
            const dashDiscovery = discoverRoutesAndTablesFromScripts(dashScripts.combinedText, current.finalUrl)
            for (const sUrl of dashScripts.scriptUrls) {
              if (!jsDiscovery.discoveredScripts.includes(sUrl)) jsDiscovery.discoveredScripts.push(sUrl)
            }
            for (const t of dashDiscovery.tables) {
              if (!jsDiscovery.discoveredTables.includes(t)) jsDiscovery.discoveredTables.push(t)
            }

            if (jsDiscovery.supabaseAccessToken && jsDiscovery.supabaseUrl && jsDiscovery.supabaseAnonKey) {
              const queriedSet = new Set<string>()
              const rows = await querySupabaseTablesSafely({
                supabaseUrl: jsDiscovery.supabaseUrl,
                anonKey: jsDiscovery.supabaseAnonKey,
                accessToken: jsDiscovery.supabaseAccessToken,
                tables: jsDiscovery.discoveredTables,
                alreadyQueried: queriedSet,
                abortSignal: opts.abortSignal,
              })
              jsDiscovery.apiDataSummaries.push(...rows)
            }
            break
          }
        } catch {
          // Probe next dashboard route cleanly
        }
      }

      // If Supabase login succeeded on login.html and we still have unqueried tables, query them cleanly
      if (
        jsDiscovery.supabaseAccessToken &&
        jsDiscovery.supabaseUrl &&
        jsDiscovery.supabaseAnonKey &&
        jsDiscovery.discoveredTables.length > 0 &&
        jsDiscovery.apiDataSummaries.length === 0
      ) {
        const rows = await querySupabaseTablesSafely({
          supabaseUrl: jsDiscovery.supabaseUrl,
          anonKey: jsDiscovery.supabaseAnonKey,
          accessToken: jsDiscovery.supabaseAccessToken,
          tables: jsDiscovery.discoveredTables,
          alreadyQueried: new Set(),
          abortSignal: opts.abortSignal,
        })
        jsDiscovery.apiDataSummaries.push(...rows)
      }

      // Remove ephemeral token from memory structure before returning
      delete jsDiscovery.supabaseAccessToken
    } else {
      const dashboardLink = findPostLoginDashboardLink($, current.finalUrl)
      if (dashboardLink && dashboardLink !== current.finalUrl && !/dashboard|wp-admin|portal/i.test(current.finalUrl)) {
        await log(`Following post-login dashboard route ${dashboardLink}`)
        const dashPage = await fetchWithCookies(jar, dashboardLink, { abortSignal: opts.abortSignal })
        if (!isNotFoundHtml(dashPage.html, dashPage.response.status)) {
          current = dashPage
          $ = cheerio.load(current.html)
        }
      }
    }
  }

  if (opts.pauseOnAuthOrCaptcha !== false) {
    const gateAfter = detectBotOrCaptchaGate($, current.html, current.response.status)
    if (gateAfter) {
      await log(`Paused cleanly on verification gate: ${gateAfter}`, 'security')
      const snap = extractSnapshot(current.html, current.finalUrl, current.response.status, {
        explicitAuthSucceeded,
        extractSelector: opts.extractSelector,
        jsDiscovery,
      })
      return {
        success: false,
        executionEngine: 'serverless_web_session',
        pausedForHumanVerification: true,
        pauseReason: `${gateAfter} Start the desktop Playwright worker with PLAYWRIGHT_HEADLESS=false for interactive login.`,
        finalUrl: current.finalUrl,
        httpStatus: current.response.status,
        pageTitle: snap.pageTitle,
        loginAttempted,
        authenticatedLikely: false,
        extractedText: snap.extractedText,
        structuredSnapshot: snap.snapshot,
        downloadedFiles: [],
      }
    }
  }

  const snap = extractSnapshot(current.html, current.finalUrl, current.response.status, {
    explicitAuthSucceeded,
    extractSelector: opts.extractSelector,
    jsDiscovery,
  })

  if (!isNotFoundHtml(current.html, current.response.status)) {
    ORIGIN_SESSION_CACHE.set(origin, {
      lastDashboardUrl: current.finalUrl,
      lastHtml: current.html,
      lastStatus: current.response.status,
      authSummary: snap.snapshot.backendAuthFindings,
      authenticated: snap.authenticatedLikely,
      cookies: jar.entries(),
      timestamp: Date.now(),
    })
  }

  await log(
    `Serverless web session finished on ${current.finalUrl} (HTTP ${current.response.status}, authenticatedLikely=${snap.authenticatedLikely}).`
  )

  return {
    success: current.response.status < 500,
    executionEngine: 'serverless_web_session',
    pausedForHumanVerification: false,
    finalUrl: current.finalUrl,
    httpStatus: current.response.status,
    pageTitle: snap.pageTitle,
    loginAttempted,
    authenticatedLikely: snap.authenticatedLikely,
    extractedText: snap.extractedText,
    structuredSnapshot: snap.snapshot,
    downloadedFiles: [],
  }
}
