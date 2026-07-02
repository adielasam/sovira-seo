import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { checkUsageLimit } from '@/lib/usage'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { type, url, context } = await req.json()
    
    if (!type || !url) {
      return NextResponse.json({ error: 'Type and URL are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
    const plan = profile?.plan || 'free'
    
    // Feature gating
    if (!['pro', 'agency'].includes(plan)) {
      return NextResponse.json({ error: 'UPGRADE_REQUIRED', message: 'This AI feature requires a Pro plan.' }, { status: 403 })
    }

    let systemPrompt = ''
    let prompt = ''

    if (type === 'meta') {
      systemPrompt = 'You are an expert SEO copywriter. Generate exactly one meta description (130-155 characters) that maximizes CTR. Do not include quotes or surrounding text. Just output the description.'
      prompt = `Generate a meta description for this page: ${url}. Context (first 300 words): ${context}`
    } else if (type === 'schema') {
      systemPrompt = 'You are a Technical SEO expert. Generate a strict, valid JSON-LD block (Organization or WebSite/Article as appropriate) based on the URL and context. Do not wrap in markdown or explain. Output raw JSON inside a single <script type="application/ld+json"> tag.'
      prompt = `Generate schema for ${url}. Context: ${context}`
    } else if (type === 'og') {
      systemPrompt = 'You are an SEO expert. Generate OpenGraph tags for a Next.js application. Output ONLY a raw JSON object with "title" (max 60 chars) and "description" (max 155 chars) keys. No markdown.'
      prompt = `Generate OG tags for ${url}. Context: ${context}`
    } else if (type === 'og-image') {
      // Simulate FLUX.1 pipeline generation by returning a branded placeholder
      // since the actual pipeline code/API keys aren't present in this directory
      const brandText = encodeURIComponent(url.replace('https://', '').split('/')[0])
      return NextResponse.json({ result: `https://placehold.co/1200x630/4f46e5/ffffff?text=${brandText}+OG+Image` })
    } else if (type === 'privacy') {
      systemPrompt = 'You are a legal privacy expert. Generate a strict GDPR/CCPA-compliant Privacy Policy for the given URL and tech stack. Output strictly in MDX format. Use standard headers.'
      prompt = `Generate a privacy policy for ${url}. Detected tech stack: ${context}`
    } else {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 })
    }

    const { text } = await generateText({
      // @ts-ignore
      model: groq('mixtral-8x7b-32768'),
      system: systemPrompt,
      prompt: prompt
    })

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: `AI ${type.toUpperCase()} Generated`,
      details: { url }
    }])

    return NextResponse.json({ result: text.trim() })
  } catch (error: any) {
    console.error('Generate SEO Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
