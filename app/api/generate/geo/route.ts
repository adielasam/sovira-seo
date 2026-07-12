import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const systemPrompt = `You are an expert in Generative Engine Optimization (GEO). Your task is to rewrite the provided content so that it is highly favored by Large Language Models (LLMs) and AI Search Engines like ChatGPT, Perplexity, and Gemini.

Key GEO strategies to apply:
- Use clear, unambiguous language.
- Structure with markdown (H2, H3) and bullet points.
- Define key concepts explicitly.
- Add an "Executive Summary" or "Key Takeaways" at the top.
- Remove fluff and filler words; prioritize information density.
- Maintain a factual, objective, and authoritative tone.`

    const prompt = `Rewrite and optimize the following content for Generative AI Search engines. Focus area: ${focus || 'General Information Retrieval'}.\n\nContent:\n${text}`

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
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const resultText = data.choices?.[0]?.message?.content

    if (!resultText) throw new Error('No content returned from Nara')

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'GEO Optimization Generated',
      details: { focus }
    }])

    return NextResponse.json({ result: resultText.trim() })
  } catch (error: any) {
    console.error('Generate GEO Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
