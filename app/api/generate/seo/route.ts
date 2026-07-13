import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'

export async function POST(req: Request) {
  try {
    const { type, topic, content } = await req.json()
    
    if (!type || (!topic && !content)) {
      return NextResponse.json({ error: 'Type and topic/content are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { limitReached, maxLimit } = await checkUsageLimit(user.id, 'words')
    if (limitReached) {
      return NextResponse.json({ error: `You have reached your AI Words limit (${maxLimit.toLocaleString()} words). Please upgrade your plan.` }, { status: 403 })
    }

    let systemPrompt = ''
    let prompt = ''

    if (type === 'meta_description') {
      systemPrompt = 'You are an SEO expert. Generate an optimized meta description (150-160 characters) that includes compelling copy to maximize CTR.'
      prompt = `Generate a meta description for a page about: "${topic}"`
    } else if (type === 'title') {
      systemPrompt = 'You are an SEO expert. Generate 3 optimized SEO title tags (under 60 characters) that include the target keyword naturally and are designed for high CTR.'
      prompt = `Generate SEO titles for a page about: "${topic}"`
    } else if (type === 'outline') {
      systemPrompt = 'You are a content strategist. Create a comprehensive SEO content outline with H2 and H3 tags. Ensure logical flow and comprehensive topic coverage.'
      prompt = `Create an SEO content outline for: "${topic}"`
    } else if (type === 'keywords') {
      systemPrompt = 'You are an SEO strategist. Generate a list of 10-15 LSI (Latent Semantic Indexing) keywords and long-tail variations that should be included in content about this topic.'
      prompt = `Generate LSI and related keywords for: "${topic}"`
    } else if (type === 'optimize') {
      systemPrompt = 'You are an SEO editor. Review the provided content and suggest specific improvements for SEO, readability, and engagement. Be concise and actionable.'
      prompt = `Analyze and suggest SEO improvements for this content:\n\n${content}`
    } else {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 })
    }

    const NARA_API_KEY = process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'
    
    const response = await fetch(`https://router.bynara.id/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NARA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (!text) throw new Error('No content returned from Nara')

    // Calculate word count approximately
    const wordCount = text.trim().split(/\s+/).length

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: `SEO Content Generated`, // MUST match the checkUsageLimit string exactly
      details: { topic: topic || 'Content optimization', type: type, words: wordCount }
    }])

    return NextResponse.json({ result: text.trim() })
  } catch (error: any) {
    console.error('Generate SEO Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
