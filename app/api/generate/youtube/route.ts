import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { type, topic, keywords } = await req.json()
    
    if (!type || !topic) {
      return NextResponse.json({ error: 'Type and topic are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let systemPrompt = ''
    let prompt = ''

    if (type === 'description') {
      systemPrompt = 'You are a master YouTube SEO expert. Generate a highly optimized, engaging YouTube video description. Include a catchy intro, a 2-paragraph summary incorporating the keywords naturally, a bulleted list of timestamps (chapters), and placeholders for social links. Format using markdown.'
      prompt = `Generate a YouTube description for a video about: "${topic}". Target keywords: ${keywords || 'none provided'}.`
    } else if (type === 'script') {
      systemPrompt = 'You are a viral YouTube scriptwriter. Generate a high-retention video script/storyboard. Include a strong hook for the first 10 seconds, an intro, the main body separated by visual cues [B-ROLL: ...], and a strong Call to Action (CTA) at the end. Format using markdown.'
      prompt = `Generate a YouTube script/story outline about: "${topic}". Target keywords: ${keywords || 'none provided'}.`
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
      action: `YouTube ${type.toUpperCase()} Generated`,
      details: { topic }
    }])

    return NextResponse.json({ result: text.trim() })
  } catch (error: any) {
    console.error('Generate YouTube Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
