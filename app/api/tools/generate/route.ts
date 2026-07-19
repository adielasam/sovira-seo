import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json()
    
    if (!action || !text) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    let systemPrompt = ''
    
    switch (action) {
      case 'humanize':
        systemPrompt = `You are an expert AI bypasser and stealth writer. 
Your goal is to rewrite the provided AI-generated text so that it sounds 100% human-written and passes all AI detectors (like Turnitin, GPTZero, Originality).
Guidelines:
- Vary sentence length and structure significantly. Add natural perplexity and burstiness.
- Use conversational, engaging, and slightly imperfect transitions where natural.
- Avoid robotic words like 'crucial', 'vital', 'moreover', 'delve', 'tapestry', 'testament'.
- Keep the core meaning, facts, and SEO value intact. Do not add fluff.
Return ONLY the rewritten text, with no introductory or concluding remarks.`
        break;
      case 'youtube':
        systemPrompt = `You are a viral YouTube strategist and SEO expert.
Generate 5 highly clickable, viral, and SEO-optimized YouTube video titles based on the user's topic.
Guidelines:
- Titles must be under 60 characters.
- Use emotional triggers, curiosity gaps, and power words.
- Format the output as a clean, numbered list. No extra chit-chat.`
        break;
      case 'meta':
        systemPrompt = `You are an elite Technical SEO expert.
Generate a high-converting, SEO-optimized Meta Description for the provided topic or page content.
Guidelines:
- Must be between 150-155 characters.
- Include a strong Call to Action (CTA) at the end.
- Naturally include primary keywords.
- Return ONLY the meta description text.`
        break;
      case 'grammar':
        systemPrompt = `You are a professional editor and proofreader.
Review the provided text and fix all grammar, spelling, and punctuation errors. 
Enhance the clarity and flow while maintaining the original tone.
Return ONLY the corrected text.`
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Direct Groq REST API call (bypasses AI SDK version mismatch issues)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Topic / Text to process: ${text}\n\nAdditional Context: ${context || 'None'}` }
        ],
        temperature: action === 'humanize' ? 0.8 : 0.7,
        max_tokens: 2000,
      })
    })

    const groqData = await groqRes.json()

    if (!groqRes.ok) {
      console.error('Groq API Error:', groqData)
      throw new Error(groqData?.error?.message || 'Groq API failed')
    }

    const generatedText = groqData.choices?.[0]?.message?.content || ''

    if (!generatedText) {
      throw new Error('No output was generated. Please try again.')
    }

    return NextResponse.json({ result: generatedText })

  } catch (error: any) {
    console.error('Tool Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
  }
}
