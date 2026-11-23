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

  captureFromResponse(res: Response) {
    const rawList: string[] = []
    const headersAny = res.headers as unknown as { getSetCookie?: () => string[] }
    if (typeof headersAny.getSetCookie === 'function') {
      rawList.push(...headersAny.getSetCookie())
    } else {
      const single = res.headers.get('set-cookie')
      if (single) {
        // Split only on comma boundaries that begin a new CookieName= pair
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
      const lower = raw.toLowerCase()
      if (lower.includes('max-age=0')) {
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
  } = {}
): Promise<{ response: Response; html: string; finalUrl: string }> {
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

    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }
    if (currentReferer) {
      headers.Referer = currentReferer
    }
    if (currentMethod === 'GET') {
      delete headers['Content-Type']
      delete headers.Origin
    }

    const res = await fetch(currentUrl, {
      method: currentMethod,
      headers,
      body: currentMethod === 'POST' ? currentBody : undefined,
      redirect: 'manual',
      signal: combineRequestSignals(20000, opts.abortSignal),
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
  if (lower.includes('wp-content') || lower.includes('wp-login.php') || lower.includes('wp-admin')) {
    if (lower.includes('learndash') || lower.includes('ld-')) return 'WordPress / LearnDash'
    if (lower.includes('tutor')) return 'WordPress / Tutor LMS'
    if (lower.includes('woocommerce')) return 'WordPress / WooCommerce'
    return 'WordPress'
  }
  if ($('input[name="_token"]').length > 0 || lower.includes('laravel')) return 'Laravel / Blade'
  if (lower.includes('__next_data__')) return 'Next.js'
  if ($('#root, #app').length > 0 && $('body').text().trim().length < 200) return 'Client-Rendered SPA (JS Required)'
  return 'Standard HTML Web App'
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

  // Fallback to forms whose action or id/class indicates login
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
    if (/wp-login\.php|\/login\b|\/signin\b|\/sign-in\b/.test(lowerHref)) score += 10
    if (/login|sign in|signin|log in|student portal|member login/.test(text)) score += 8
    if (/portal|dashboard|my-account|account|auth|student/.test(lowerHref)) score += 4
    if (score > 0) {
      candidates.push({ score, url: absUrl })
    }
  })

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5).map((c) => c.url)
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
    if (/\/dashboard\b|\/wp-admin\b|\/portal\b|\/student-dashboard\b/.test(lower)) score += 10
    if (/my-account|account|courses|overview|profile/.test(lower)) score += 6
    if (/dashboard|my courses|student area|overview/.test(text)) score += 6
    if (/logout|log-out|signout/.test(lower)) score = 0

    if (score > 0 && (!best || score > best.score)) {
      best = { score, url: abs }
    }
  })

  return best ? (best as { score: number; url: string }).url : null
}

function buildFormSubmissionPayload(
  $: cheerio.CheerioAPI,
  $form: cheerio.Cheerio<any>,
  fillActions: Array<{ selector?: string; value: string }>
): { payload: URLSearchParams; populatedFields: string[] } {
  const payload = new URLSearchParams()
  const populatedFields: string[] = []
  const usedFillIndices = new Set<number>()

  // 1. Collect hidden inputs & defaults first
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

  // Include first named submit button if present
  const $submit = $form.find('input[type="submit"][name], button[type="submit"][name], button[name]').first()
  const submitName = $submit.attr('name')
  if (submitName) {
    payload.set(submitName, $submit.attr('value') ?? $submit.text().trim() ?? '1')
  }

  // 2. Match explicit CSS selectors from plan actions inside the form
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
      // Invalid CSS selector from LLM; handled cleanly by smart heuristic matching below
    }
  })

  // 3. Smart heuristic matching for any remaining fill actions (username/email & password)
  const remainingFills = fillActions
    .map((act, idx) => ({ act, idx }))
    .filter(({ idx }) => !usedFillIndices.has(idx))

  if (remainingFills.length > 0) {
    const passwordInput = $form.find('input[type="password"][name]').first()
    const passwordFieldName = passwordInput.attr('name')

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
      const looksLikePasswordSelector = /pass|pwd|secret/.test(selHint)
      const looksLikeUserSelector = /user|email|mail|log|name/.test(selHint) || act.value.includes('@')

      if (looksLikePasswordSelector && passwordFieldName && !populatedFields.includes(passwordFieldName)) {
        payload.set(passwordFieldName, act.value)
        populatedFields.push(passwordFieldName)
      } else if (looksLikeUserSelector && usernameFieldName && !populatedFields.includes(usernameFieldName)) {
        payload.set(usernameFieldName, act.value)
        populatedFields.push(usernameFieldName)
      } else if (usernameFieldName && !populatedFields.includes(usernameFieldName) && !looksLikePasswordSelector) {
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

function extractSnapshot(
  html: string,
  finalUrl: string,
  httpStatus: number,
  loginAttempted: boolean,
  extractSelector?: string
): { pageTitle: string; extractedText: string; authenticatedLikely: boolean; snapshot: WebSessionSnapshot } {
  const $ = cheerio.load(html)
  const pageTitle = $('title').first().text().replace(/\s+/g, ' ').trim()
  const detectedPlatform = detectPlatform($, html)
  const formCount = $('form').length
  const hasPasswordField = $('input[type="password"]').length > 0

  const loginErrors: string[] = []
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
  $('nav a[href], aside a[href], header a[href], .menu a[href], .sidebar a[href], .dashboard a[href]').each((_, el) => {
    if (navigationLinks.length >= 30) return
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    const href = ($(el).attr('href') || '').trim()
    if (!text || !href || href === '#' || href.startsWith('javascript:')) return
    let absHref = href
    try {
      absHref = new URL(href, finalUrl).toString()
    } catch {
      // Keep original href
    }
    const key = `${text}|${absHref}`
    if (!seenNav.has(key)) {
      seenNav.add(key)
      navigationLinks.push({ text: text.slice(0, 80), href: absHref })
    }
  })

  const dashboardCardsAndMetrics: string[] = []
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

  // Strip non-visible noise before extracting readable body text
  $('script, style, noscript, svg').remove()
  const rawExtract = extractSelector ? $(extractSelector).first().text() : $('body').text()
  const extractedText = (rawExtract || '').replace(/\s+/g, ' ').trim().slice(0, 6000)

  const authenticatedLikely =
    loginErrors.length === 0 &&
    !hasPasswordField &&
    (hasLogoutIndicator ||
      /dashboard|my account|enrolled courses|welcome back|my profile/i.test(
        `${pageTitle} ${finalUrl} ${extractedText.slice(0, 1500)}`
      ))

  return {
    pageTitle,
    extractedText,
    authenticatedLikely,
    snapshot: {
      headings,
      navigationLinks,
      dashboardCardsAndMetrics,
      loginErrors,
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

  const jar = new InMemoryCookieJar()
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

  await log(`Opening serverless HTTP session for ${opts.url}`)
  let current = await fetchWithCookies(jar, opts.url, { abortSignal: opts.abortSignal })
  let $ = cheerio.load(current.html)

  if (opts.pauseOnAuthOrCaptcha !== false) {
    const gate = detectBotOrCaptchaGate($, current.html, current.response.status)
    if (gate) {
      await log(`Paused cleanly on anti-bot gate: ${gate}`, 'security')
      const snap = extractSnapshot(current.html, current.finalUrl, current.response.status, false, opts.extractSelector)
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

  // Handle any pre-login navigate URL specified in actions before login
  const preNavigate = actions.find((a) => a.type === 'navigate' && a.value && /^https?:\/\//i.test(a.value))
  if (preNavigate?.value && !findLoginForm($)) {
    await log(`Following planned navigation URL ${preNavigate.value}`)
    current = await fetchWithCookies(jar, preNavigate.value, { abortSignal: opts.abortSignal })
    $ = cheerio.load(current.html)
  }

  if (hasExplicitLogin) {
    let $loginForm = findLoginForm($)

    // Discover login page if initial URL has no login form
    if (!$loginForm) {
      const origin = new URL(current.finalUrl).origin
      const discoveredLinks = findBestLoginLinks($, current.finalUrl)
      const fallbackPaths = [
        `${origin}/login`,
        `${origin}/wp-login.php`,
        `${origin}/my-account/`,
        `${origin}/signin`,
        `${origin}/dashboard`,
        `${origin}/portal`,
      ]
      const probeUrls = Array.from(new Set([...discoveredLinks, ...fallbackPaths]))

      for (const candidateUrl of probeUrls) {
        if (opts.abortSignal?.aborted) throw new Error('CANCELLED_BY_USER')
        try {
          const probe = await fetchWithCookies(jar, candidateUrl, { abortSignal: opts.abortSignal })
          const $probe = cheerio.load(probe.html)
          const formFound = findLoginForm($probe)
          if (formFound && probe.response.status < 400) {
            await log(`Located login form on ${probe.finalUrl}`)
            current = probe
            $ = $probe
            $loginForm = formFound
            break
          }
        } catch {
          // Continue probing next login candidate cleanly
        }
      }
    }

    if ($loginForm) {
      const formActionRaw = ($loginForm.attr('action') || '').trim() || current.finalUrl
      const formActionUrl = assertSafeHttpUrl(new URL(formActionRaw, current.finalUrl).toString())
      const formMethod = (($loginForm.attr('method') || 'POST').trim().toUpperCase() === 'GET' ? 'GET' : 'POST') as
        | 'GET'
        | 'POST'

      if (formActionUrl.includes('wp-login.php') || current.html.includes('wp-login.php')) {
        jar.set('wordpress_test_cookie', 'WP+Cookie+check')
      }

      const { payload, populatedFields } = buildFormSubmissionPayload($, $loginForm, fillActions)
      for (const fieldName of populatedFields) {
        await log(`Populating form field "${fieldName}" ([INPUT_REDACTED])`, 'security')
      }

      loginAttempted = true
      await log(`Submitting ${formMethod} authentication form to ${formActionUrl} (${jar.size()} cookie(s) in jar)`)

      if (formMethod === 'GET') {
        const target = new URL(formActionUrl)
        payload.forEach((v, k) => target.searchParams.set(k, v))
        current = await fetchWithCookies(jar, target.toString(), { abortSignal: opts.abortSignal })
      } else {
        current = await fetchWithCookies(jar, formActionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: new URL(current.finalUrl).origin,
            Referer: current.finalUrl,
          },
          body: payload.toString(),
          abortSignal: opts.abortSignal,
        })
      }
      $ = cheerio.load(current.html)

      if (opts.pauseOnAuthOrCaptcha !== false) {
        const gateAfter = detectBotOrCaptchaGate($, current.html, current.response.status)
        if (gateAfter) {
          await log(`Paused cleanly after login submission: ${gateAfter}`, 'security')
          const snap = extractSnapshot(current.html, current.finalUrl, current.response.status, true, opts.extractSelector)
          return {
            success: false,
            executionEngine: 'serverless_web_session',
            pausedForHumanVerification: true,
            pauseReason: `${gateAfter} Start the desktop Playwright worker with PLAYWRIGHT_HEADLESS=false for interactive login.`,
            finalUrl: current.finalUrl,
            httpStatus: current.response.status,
            pageTitle: snap.pageTitle,
            loginAttempted: true,
            authenticatedLikely: false,
            extractedText: snap.extractedText,
            structuredSnapshot: snap.snapshot,
            downloadedFiles: [],
          }
        }
      }

      // Check if post-login landed on a generic home/profile page and follow dashboard link if present
      const dashboardLink = findPostLoginDashboardLink($, current.finalUrl)
      if (dashboardLink && dashboardLink !== current.finalUrl && !/dashboard|wp-admin|portal/i.test(current.finalUrl)) {
        await log(`Following post-login dashboard route ${dashboardLink}`)
        current = await fetchWithCookies(jar, dashboardLink, { abortSignal: opts.abortSignal })
        $ = cheerio.load(current.html)
      }
    } else {
      await log(
        'No server-rendered <form> with a password input was detected in initial HTML; site may use client-side JavaScript rendering (requires desktop Playwright worker).',
        'warn'
      )
    }
  }

  const snap = extractSnapshot(
    current.html,
    current.finalUrl,
    current.response.status,
    loginAttempted,
    opts.extractSelector
  )

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
