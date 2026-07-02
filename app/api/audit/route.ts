import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'
import * as cheerio from 'cheerio'
import dns from 'dns/promises'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { allowed, limitReached } = await checkUsageLimit(user.id, 'audit')
      if (limitReached) {
        return NextResponse.json({ error: 'LIMIT_REACHED', message: 'You have reached your Free plan audit limit.' }, { status: 403 })
      }
    }

    const targetUrl = new URL(url)
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`

    // 1. Fetch HTML and Headers
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }
    const html = await response.text()
    const $ = cheerio.load(html)
    const headers = response.headers

    // 2. Technical Checks
    const robotsRes = await fetch(`${baseUrl}/robots.txt`).catch(() => null)
    const robotsTxt = robotsRes?.ok ? await robotsRes.text() : ''
    
    const soft404Res = await fetch(`${baseUrl}/sovira-404-test-${Date.now()}`).catch(() => null)
    const isSoft404 = soft404Res ? soft404Res.status !== 404 : false

    const llmsRes = await fetch(`${baseUrl}/llms.txt`).catch(() => null)
    const agentsRes = await fetch(`${baseUrl}/agents.txt`).catch(() => null)

    let dmarcMissing = false
    try {
      const records = await dns.resolveTxt(`_dmarc.${targetUrl.host}`)
      const dmarc = records.flat().find(r => r.includes('v=DMARC1'))
      if (!dmarc || dmarc.includes('p=none')) dmarcMissing = true
    } catch (e) {
      dmarcMissing = true
    }

    // 3. Analyze Data
    const issues: Record<string, any[]> = {
      onPage: [],
      aiReadability: [],
      social: [],
      technical: [],
      privacy: [],
      analytics: [],
      speed: [] // We'll mock Lighthouse speed for now as Google API can be slow/flakey, or we can still run it
    }

    const scores: Record<string, number> = {
      onPage: 100, aiReadability: 100, social: 100, technical: 100,
      privacy: 100, analytics: 100, speed: 70, content: 100, accessibility: 100, overall: 100
    }

    const addIssue = (category: string, type: 'critical'|'warning'|'info'|'success', title: string, desc: string, fix?: string) => {
      issues[category].push({ type, title, description: desc, fix })
      if (type === 'critical') scores[category] = Math.max(0, scores[category] - 20)
      if (type === 'warning') scores[category] = Math.max(0, scores[category] - 10)
    }

    // On-Page Analysis
    const metaDesc = $('meta[name="description"]').attr('content')
    if (!metaDesc) addIssue('onPage', 'critical', 'Missing Meta Description', 'No description found.', 'meta')

    const h1s = $('h1')
    if (h1s.length === 0) addIssue('onPage', 'critical', 'Missing H1', 'No H1 tag found.')
    else if (h1s.length > 1) addIssue('onPage', 'warning', 'Multiple H1s', 'More than one H1 found.')

    // Simplistic heading gap check
    let lastLevel = 1;
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = parseInt(el.tagName.replace('h', ''))
      if (level - lastLevel > 1) addIssue('onPage', 'warning', 'Heading Gap', `Skipped from H${lastLevel} to H${level}`)
      lastLevel = level
    })

    const internalLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || ''
      return href.startsWith('/') || href.includes(targetUrl.host)
    }).length
    if (internalLinks < 2) addIssue('onPage', 'warning', 'Low Internal Links', `Only ${internalLinks} internal links found.`)

    const wordCount = $('body').text().split(/\s+/).length
    if (wordCount < 300) {
      addIssue('onPage', 'warning', 'Thin Content', `Only ${wordCount} words found.`)
      scores.content -= 30
    }

    // AI Readability
    const jsonLd = $('script[type="application/ld+json"]').length
    if (jsonLd === 0) addIssue('aiReadability', 'critical', 'Missing JSON-LD', 'No structured data found.', 'schema')

    const semanticTags = ['main', 'article', 'header', 'nav', 'footer']
    let missingSemantic = semanticTags.filter(t => $(t).length === 0)
    if (missingSemantic.length > 0) addIssue('aiReadability', 'warning', 'Missing Semantic Tags', `Missing: ${missingSemantic.join(', ')}`)

    if (!llmsRes?.ok && !agentsRes?.ok) addIssue('aiReadability', 'warning', 'No AI Agents Text', 'Missing /llms.txt or /agents.txt')
    if (robotsTxt && !robotsTxt.includes('GPTBot')) addIssue('aiReadability', 'warning', 'GPTBot Not Blocked', 'You may want to control AI scraping in robots.txt')

    // Social & OG Tags
    if (!$('meta[property="og:title"]').length) addIssue('social', 'warning', 'Missing og:title', 'No OpenGraph title.', 'og')
    if (!$('meta[property="og:image"]').length) addIssue('social', 'critical', 'Missing og:image', 'No OpenGraph image.', 'og_image')
    if (!$('meta[name="twitter:card"]').length) addIssue('social', 'warning', 'Missing twitter:card', 'No Twitter card defined.')
    
    // Technical
    if (!robotsTxt.toLowerCase().includes('sitemap:')) addIssue('technical', 'critical', 'Missing Sitemap in robots.txt', 'No sitemap declaration found.', `Sitemap: ${baseUrl}/sitemap.xml`)
    if (!$('link[rel="canonical"]').length) addIssue('technical', 'critical', 'Missing Canonical', 'No canonical tag found.', `<link rel="canonical" href="${url}" />`)
    if (isSoft404) addIssue('technical', 'critical', 'Soft 404 Detected', 'Random non-existent URLs do not return 404.', `import { notFound } from 'next/navigation'\n\nif (!data) notFound()`)
    if (!headers.get('x-frame-options') && !headers.get('content-security-policy')) addIssue('technical', 'warning', 'Missing Security Headers', 'Security headers missing.', `// next.config.js\nmodule.exports = {\n  async headers() {\n    return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }]\n  }\n}`)
    if (dmarcMissing) addIssue('technical', 'warning', 'DMARC Missing/Weak', 'DNS DMARC record is missing or set to p=none', `_dmarc.${targetUrl.host} TXT "v=DMARC1; p=quarantine; rua=mailto:admin@${targetUrl.host}"`)

    // Privacy & Trust
    const links = $('a').map((_, el) => $(el).attr('href')?.toLowerCase() || '').get()
    if (!links.some(l => l.includes('privacy'))) addIssue('privacy', 'critical', 'Missing Privacy Policy', 'No link to privacy policy found.', 'privacy')
    if (!links.some(l => l.includes('terms'))) addIssue('privacy', 'warning', 'Missing Terms of Service', 'No link to terms found.')
    if (!headers.get('referrer-policy')) addIssue('privacy', 'warning', 'Missing Referrer-Policy', 'Header missing.', `// next.config.js headers array\n{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }`)

    // Analytics
    const scripts = $('script').map((_, el) => $(el).html() || $(el).attr('src') || '').get().join(' ').toLowerCase()
    const hasAnalytics = ['gtag', 'plausible', 'fathom', 'umami', 'matomo', 'analytics'].some(a => scripts.includes(a))
    if (!hasAnalytics) {
      addIssue('analytics', 'critical', 'No Analytics Detected', 'You are flying blind. We recommend privacy-first analytics like Plausible.', `import Script from 'next/script'\n\n<Script defer data-domain="${targetUrl.host}" src="https://plausible.io/js/script.js" strategy="afterInteractive" />`)
      scores.analytics = 0
    }

    // Calculate Overall
    const allScores = Object.values(scores)
    scores.overall = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)

    // Save to DB and calculate delta
    let auditId = null
    let previousScores = null
    
    if (user) {
      // Get previous audit
      const { data: prevAudit, error: prevError } = await supabase
        .from('audits')
        .select('scores')
        .eq('user_id', user.id)
        .eq('url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
      if (prevError && prevError.code !== 'PGRST116') {
        console.error('Error fetching prev audit:', prevError)
      }
        
      if (prevAudit) {
        previousScores = prevAudit.scores
      }

      const { data: auditRecord, error: insertError } = await supabase.from('audits').insert([{
        user_id: user.id,
        url: url,
        scores: scores,
        issues: issues
      }]).select('id').single()
      
      if (insertError) {
        console.error('Audit insert error:', insertError)
        throw new Error(`Database Insert Error: ${insertError.message}`)
      }
      
      if (auditRecord) auditId = auditRecord.id

      // Also log to activity_logs for dashboard compatibility
      const { error: logError } = await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Audit Run',
        details: { url, overallScore: scores.overall }
      }])
      
      if (logError) {
        console.error('Activity log error:', logError)
      }
    }

    return NextResponse.json({
      id: auditId,
      scores,
      issues,
      previousScores
    })
  } catch (error: any) {
    console.error('Audit Error:', error)
    return NextResponse.json({ error: 'Failed to run audit. Ensure URL is publicly accessible.' }, { status: 500 })
  }
}
