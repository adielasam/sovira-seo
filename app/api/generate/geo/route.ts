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

    const apiKey = process.env.GROQ_API_KEY
    let resultText = ''

    if (apiKey) {
      const candidateModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
      for (const model of candidateModels) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 3000
            })
          })

          if (response.ok) {
            const data = await response.json()
            const candidate = data.choices?.[0]?.message?.content
            if (candidate && candidate.trim().length > 0) {
              resultText = candidate
              break
            }
          }
        } catch (e) {}
      }
    }

    if (!resultText) throw new Error('AI service temporarily unavailable. Please try again.')

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
