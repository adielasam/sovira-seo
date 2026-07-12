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
    const { text, focus } = await req.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const systemPrompt = `You are a Generative Engine Optimization (GEO) Expert. Your job is to optimize content so that AI search engines (like ChatGPT, Perplexity, Google SGE) can easily extract, cite, and recommend it.
Rules for GEO:
1. Clearly define entities and concepts early.
2. Use structured data formats (lists, tables, Q&A) heavily.
3. Cite authoritative statistics or facts if applicable.
4. Keep paragraphs short and semantic.
5. Provide a clear "TL;DR" or summary at the top.
Format the output in clean markdown.`

    const prompt = `Rewrite and optimize the following content for Generative AI Search engines. Focus area: ${focus || 'General Information Retrieval'}.\n\nContent:\n${text}`

    const { text: resultText } = await generateText({
      model: groq('llama3-8b-8192'),
      system: systemPrompt,
      prompt: prompt
    })

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: `GEO Content Optimized`,
      details: { focus }
    }])

    return NextResponse.json({ result: resultText.trim() })
  } catch (error: any) {
    console.error('Generate GEO Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
