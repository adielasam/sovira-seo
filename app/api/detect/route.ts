import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFreeToolDailyUsage } from '@/lib/usage'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Text must be at least 50 characters long to analyze accurately.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check daily limits for Free Tool
    const { allowed, maxLimit, isPaid } = await checkFreeToolDailyUsage(user.id, 'aidetector')
    if (!allowed) {
      return NextResponse.json({ error: `You have reached your daily limit of ${maxLimit} AI Detection scans on the Free plan. Please upgrade to a paid plan.` }, { status: 403 })
    }

    // Calculate simple burstiness metadata to feed to the LLM for better accuracy
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [text]
    const lengths = sentences.map((s: string) => s.trim().split(/\s+/).length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length
    const burstinessScore = Math.sqrt(variance) // Standard deviation of sentence length

    const systemPrompt = `You are a strict, highly accurate AI Detection Engine designed to match Turnitin and GPTZero.
You do not guess. You calculate a score strictly based on the following AI linguistic markers.
Start at 0% (100% Human) and ADD points for every AI flag found, up to a maximum of 100% (Definitely AI).

SCORING MATRIX:
1. +25 points for "AI Tell-words" (delve, tapestry, testament, crucial, vital, paradigm, multifaceted, comprehensive, nuanced, underscores, leveraging, embarking, beacon).
2. +25 points for "Uniform Sentence Length" (low burstiness). AI sentences are almost all 15-25 words. Humans mix 5-word sentences with 40-word sentences.
3. +20 points for "Robotic Hedging & Connectors" (It is important to note, additionally, furthermore, moreover, consequently, ultimately, thus).
4. +15 points for "Nominalization" (Using complex noun phrases like "the facilitation of learning" instead of "helping students learn").
5. +15 points for "Lack of Personal Voice" (Zero contractions, zero rhetorical questions, zero colloquialisms, zero dashes or dramatic pauses).

METADATA PROVIDED TO YOU:
- Text length: ${lengths.length} sentences
- Burstiness (Sentence length standard deviation): ${burstinessScore.toFixed(2)} (Below 5.0 is highly robotic/AI. Above 8.0 is very human).

Calculate the final score strictly based on these rules. 
If the text contains NO tell-words, has high burstiness (>8.0), uses active voice, and uses contractions, the score MUST be 0-10%.
If it uses "Furthermore", "delve", and has low burstiness, it MUST be 80-100%.

You MUST return ONLY a valid JSON object. Do not include markdown blocks like \`\`\`json. Return raw JSON:
{
  "score": number, 
  "reasoning": "A highly technical 2-sentence explanation of the exact points you awarded based on the matrix and the text's burstiness."
}`

    const prompt = `Analyze this text:\n\n${text}`

    const apiKey = (process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'NARA_API_KEY is missing' }, { status: 500 })
    }
    
    const response = await fetch(`https://router.bynara.id/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const resultText = data.choices?.[0]?.message?.content
    
    if (!resultText) throw new Error('No content returned from Nara')

    let parsed
    try {
      parsed = JSON.parse(resultText)
    } catch (e) {
      // Fallback if the AI fails to return strict JSON
      parsed = {
        score: 50,
        reasoning: "Analysis failed due to a formatting error from the detection engine."
      }
    }

    const wordCount = text.trim().split(/\s+/).length

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: `AI Detection Scan`, 
      details: { score: parsed.score, words: wordCount }
    }])

    return NextResponse.json(parsed)

  } catch (error: any) {
    console.error('AI Detector Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to analyze text' }, { status: 500 })
  }
}
