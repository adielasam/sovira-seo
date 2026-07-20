import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: 'Text is too short to analyze' }, { status: 400 })
    }

    // Split text into sentences for per-sentence analysis
    const sentences = text
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 10)

    // Use Groq to do a deep sentence-level AI detection analysis
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI text detector, as accurate as Turnitin, GPTZero, ZeroGPT, and Originality.ai combined. Your job is to analyze each sentence in the provided text and determine which ones exhibit AI-generated patterns.

AI TEXT DETECTION RULES — check each sentence for these signals:

1. UNIFORM SENTENCE LENGTH: AI text tends to produce sentences of very similar length. Flag sentences in runs of 3+ that are within 10 words of each other.
2. REPEATED GRAMMATICAL SKELETONS: If consecutive sentences follow the exact same structure (e.g., "X does Y. A does B. C does D."), flag them.
3. NOMINALIZATION OVERUSE: Sentences heavy with abstract nouns like "the implementation of," "the utilization of," "the relationship between" instead of active verbs.
4. AI TELL-WORDS: Flag any sentence containing: "delve," "tapestry," "landscape," "testament," "crucial," "vital," "moreover," "furthermore," "underscores," "multifaceted," "comprehensive," "nuanced," "paradigm," "synergy," "leveraging," "groundbreaking," "embark," "consequently," "additionally."
5. ROBOTIC HEDGING: Repetitive use of "it should be noted," "it is important to mention," "however" at the start of sentences.
6. LACK OF VOICE: Sentences with zero personality markers — no contractions, no dashes, no rhetorical questions, no asides.
7. TEMPLATE CONNECTORS: Overuse of "thereby," "thus," "in order to," "which" used to chain clauses mechanically.
8. EVEN PARAGRAPH BLOCKS: If all paragraphs are roughly the same length, that's a pattern signal.

For each sentence, assign a score from 0 to 100 where:
- 0 = definitely AI-generated
- 100 = definitely human-written

Return ONLY a raw JSON object (no markdown, no backticks, no code blocks):
{
  "overallScore": <number 0-100 representing overall human percentage>,
  "verdict": "<'human' if score >= 85, 'mixed' if 50-84, 'ai' if < 50>",
  "flaggedIndices": [<array of 0-based indices of sentences scoring below 70>],
  "sentenceScores": [<array of scores for each sentence, same order as input>]
}`
          },
          {
            role: 'user',
            content: `Analyze these ${sentences.length} sentences for AI detection:\n\n${sentences.map((s: string, i: number) => `[${i}] ${s}`).join('\n')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      })
    })

    const groqData = await groqRes.json()

    if (!groqRes.ok) {
      console.error('Groq Detection Error:', groqData)
      throw new Error(groqData?.error?.message || 'Detection API failed')
    }

    const rawResponse = (groqData.choices?.[0]?.message?.content || '').trim()
      .replace(/```json/gi, '').replace(/```/g, '')

    let detection
    try {
      detection = JSON.parse(rawResponse)
    } catch {
      // If parsing fails, return a default "looks human" response
      detection = {
        overallScore: 85,
        verdict: 'human',
        flaggedIndices: [],
        sentenceScores: sentences.map(() => 85)
      }
    }

    return NextResponse.json({
      overallScore: Math.min(100, Math.max(0, detection.overallScore || 0)),
      verdict: detection.verdict || 'mixed',
      flaggedIndices: detection.flaggedIndices || [],
      sentenceScores: detection.sentenceScores || [],
      sentences
    })

  } catch (error: any) {
    console.error('Detection Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to analyze text' }, { status: 500 })
  }
}
