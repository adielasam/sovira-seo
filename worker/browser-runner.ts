import fs from 'node:fs/promises'
import path from 'node:path'

export interface BrowserActionItem {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'screenshot' | 'download' | 'upload'
  selector?: string
  valueKey?: string
  value?: string
  filePath?: string
}

export interface BrowserRunOptions {
  taskId: string
  stepOrder: number
  url: string
  profileId?: string
  extractSelector?: string
  captureScreenshot?: boolean
  actions?: BrowserActionItem[]
  pauseOnAuthOrCaptcha?: boolean
  resolvedValues?: Record<string, string>
  abortSignal?: AbortSignal
  onLog?: (message: string, level?: 'info' | 'warn' | 'error' | 'security') => Promise<void>
}

export interface BrowserRunResult {
  success: boolean
  pausedForHumanVerification: boolean
  pauseReason?: string
  finalUrl?: string
  pageTitle?: string
  extractedText?: string
  screenshotPath?: string
  downloadedFiles: string[]
  error?: string
}

const PROFILES_ROOT = path.join(process.cwd(), '.worker-profiles')
const ARTIFACTS_ROOT = path.join(process.cwd(), '.worker-artifacts')

async function loadPlaywright(): Promise<any> {
  const pkgName: string = 'playwright'
  try {
    return await import(pkgName)
  } catch (err: any) {
    throw new Error(
      `Playwright is not installed in this worker environment. Install it cleanly with "pnpm add -D playwright && npx playwright install chromium". (${err?.message || 'module not found'})`
    )
  }
}

async function detectAuthOrCaptchaChallenge(page: any, allowPasswordForm = false): Promise<string | null> {
  try {
    const check = await page.evaluate((skipPasswordCheck: boolean) => {
      const url = window.location.href.toLowerCase()
      const title = (document.title || '').toLowerCase()
      const text = (document.body?.innerText || '').slice(0, 8000).toLowerCase()

      const hasCaptchaIframe = Boolean(
        document.querySelector(
          'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], .cf-turnstile, .g-recaptcha'
        )
      )
      if (hasCaptchaIframe) {
        return 'Detected anti-bot/CAPTCHA challenge element (reCAPTCHA, hCaptcha, or Cloudflare Turnstile).'
      }

      if (
        title.includes('just a moment') ||
        text.includes('verify you are human') ||
        text.includes('checking your browser')
      ) {
        return 'Detected human verification gate ("verify you are human" / interstitial).'
      }

      if (
        text.includes('two-factor') ||
        text.includes('enter verification code') ||
        text.includes('authenticator app') ||
        text.includes('one-time password') ||
        (url.includes('challenge') && text.includes('verify'))
      ) {
        return 'Detected MFA / 2FA verification prompt.'
      }

      if (!skipPasswordCheck) {
        const hasPasswordField = Boolean(document.querySelector('input[type="password"]'))
        if (hasPasswordField && (url.includes('login') || url.includes('signin') || text.includes('sign in'))) {
          return 'Detected login authentication form requiring manual verification.'
        }
      }

      return null
    }, allowPasswordForm)
    return check
  } catch {
    return null
  }
}

export async function runIsolatedBrowserTask(opts: BrowserRunOptions): Promise<BrowserRunResult> {
  const log = async (msg: string, level: 'info' | 'warn' | 'error' | 'security' = 'info') => {
    if (opts.onLog) await opts.onLog(msg, level)
  }

  const safeProfile = (opts.profileId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')
  const userDataDir = path.join(PROFILES_ROOT, safeProfile)
  const taskArtifactDir = path.join(ARTIFACTS_ROOT, opts.taskId.replace(/[^a-zA-Z0-9_-]/g, '_'))

  await fs.mkdir(userDataDir, { recursive: true })
  await fs.mkdir(taskArtifactDir, { recursive: true })

  const playwright = await loadPlaywright()
  const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false'

  let context: any = null
  const downloadedFiles: string[] = []
  let screenshotPath: string | undefined

  const abortHandler = () => {
    if (context) {
      context.close().catch(() => {})
    }
  }
  opts.abortSignal?.addEventListener('abort', abortHandler, { once: true })

  try {
    if (opts.abortSignal?.aborted) {
      throw new Error('Browser task aborted before launch')
    }

    await log(`Launching isolated Playwright Chromium profile "${safeProfile}" (headless=${headless}).`)
    context = await playwright.chromium.launchPersistentContext(userDataDir, {
      headless,
      acceptDownloads: true,
      viewport: { width: 1366, height: 820 },
    })

    const page = context.pages()[0] || (await context.newPage())
    page.setDefaultTimeout(25000)

    // Capture downloads cleanly
    page.on('download', async (download: any) => {
      try {
        const suggested = path.basename(download.suggestedFilename() || `download_${Date.now()}.bin`)
        const destPath = path.join(taskArtifactDir, suggested)
        await download.saveAs(destPath)
        downloadedFiles.push(destPath)
        await log(`Captured file download cleanly: ${suggested}`)
      } catch (err: any) {
        await log(`Failed saving download: ${err?.message || 'error'}`, 'warn')
      }
    })

    await log(`Navigating to ${opts.url}`)
    await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1200)

    const hasFillActions = Boolean(opts.actions?.some((a) => a.type === 'fill'))

    if (opts.pauseOnAuthOrCaptcha !== false) {
      const challenge = await detectAuthOrCaptchaChallenge(page, hasFillActions)
      if (challenge) {
        screenshotPath = path.join(taskArtifactDir, `step_${opts.stepOrder}_human_verify.png`)
        await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {})
        await log(
          `Paused cleanly without bypassing security control: ${challenge}`,
          'security'
        )
        return {
          success: false,
          pausedForHumanVerification: true,
          pauseReason: challenge,
          finalUrl: page.url(),
          pageTitle: await page.title().catch(() => ''),
          screenshotPath,
          downloadedFiles,
        }
      }
    }

    // Execute scripted actions cleanly (strict allow-list, no eval/cookies/secret logging)
    for (const action of opts.actions || []) {
      if (opts.abortSignal?.aborted) {
        throw new Error('Browser task cancelled mid-execution')
      }

      switch (action.type) {
        case 'navigate': {
          if (action.value && /^https?:\/\//i.test(action.value)) {
            await log(`Navigating to ${action.value}`)
            await page.goto(action.value, { waitUntil: 'domcontentloaded', timeout: 30000 })
          }
          break
        }
        case 'click': {
          if (action.selector) {
            await log(`Clicking selector "${action.selector}"`)
            await page.locator(action.selector).first().click({ timeout: 15000 })
          }
          break
        }
        case 'fill': {
          if (action.selector) {
            const secretResolved = action.valueKey && opts.resolvedValues ? opts.resolvedValues[action.valueKey] : undefined
            const inputValue = secretResolved ?? action.value ?? ''
            // Never log plaintext filled input values in audit logs
            await log(`Populating field "${action.selector}" ([INPUT_REDACTED])`, 'security')
            await page.locator(action.selector).first().fill(inputValue, { timeout: 15000 })
          }
          break
        }
        case 'select': {
          if (action.selector && action.value) {
            await log(`Selecting option on "${action.selector}"`)
            await page.locator(action.selector).first().selectOption(action.value, { timeout: 15000 })
          }
          break
        }
        case 'upload': {
          if (action.selector && action.filePath) {
            await log(`Uploading file to "${action.selector}"`)
            await page.locator(action.selector).first().setInputFiles(action.filePath)
          }
          break
        }
        case 'wait': {
          await page.waitForTimeout(Math.min(10000, Math.max(250, Number(action.value || 1500))))
          break
        }
        case 'screenshot': {
          screenshotPath = path.join(taskArtifactDir, `step_${opts.stepOrder}_${Date.now()}.png`)
          await page.screenshot({ path: screenshotPath, fullPage: true })
          await log(`Captured screenshot: ${path.basename(screenshotPath)}`)
          break
        }
        case 'download': {
          if (action.selector) {
            await log(`Waiting for download trigger on "${action.selector}"`)
            const [download] = await Promise.all([
              page.waitForEvent('download', { timeout: 20000 }),
              page.locator(action.selector).first().click(),
            ])
            const suggested = path.basename(download.suggestedFilename() || `download_${Date.now()}.bin`)
            const destPath = path.join(taskArtifactDir, suggested)
            await download.saveAs(destPath)
            downloadedFiles.push(destPath)
          }
          break
        }
      }

      if (opts.pauseOnAuthOrCaptcha !== false) {
        const challengeAfter = await detectAuthOrCaptchaChallenge(page, hasFillActions)
        if (challengeAfter) {
          screenshotPath = path.join(taskArtifactDir, `step_${opts.stepOrder}_human_verify.png`)
          await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {})
          await log(`Paused for manual human verification: ${challengeAfter}`, 'security')
          return {
            success: false,
            pausedForHumanVerification: true,
            pauseReason: challengeAfter,
            finalUrl: page.url(),
            pageTitle: await page.title().catch(() => ''),
            screenshotPath,
            downloadedFiles,
          }
        }
      }
    }

    if (opts.captureScreenshot !== false && !screenshotPath) {
      screenshotPath = path.join(taskArtifactDir, `step_${opts.stepOrder}_final.png`)
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {})
    }

    const finalUrl = page.url()
    const pageTitle = await page.title().catch(() => '')
    let extractedText = ''

    if (opts.extractSelector) {
      extractedText = await page.locator(opts.extractSelector).first().innerText().catch(() => '')
    } else {
      extractedText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 6000)).catch(() => '')
    }

    await log(`Browser automation step completed cleanly on ${finalUrl}.`)

    return {
      success: true,
      pausedForHumanVerification: false,
      finalUrl,
      pageTitle,
      extractedText: extractedText.trim(),
      screenshotPath,
      downloadedFiles,
    }
  } finally {
    opts.abortSignal?.removeEventListener('abort', abortHandler)
    if (context) {
      await context.close().catch(() => {})
      await log('Closed and cleaned up isolated Playwright browser context.')
    }
  }
}
