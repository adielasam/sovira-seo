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
        systemPrompt = `You are a world-class stealth rewriter. Your sole job is to take AI-generated text and rewrite it so it reads as genuinely human-written prose that scores 0% AI on every detector (Turnitin, GPTZero, ZeroGPT, Originality.ai, Copyleaks). You are not summarizing — you are rewriting the FULL text with every fact, figure, and argument preserved.

MANDATORY REWRITING RULES — apply ALL of these simultaneously:

1. SENTENCE LENGTH VARIATION: This is the #1 signal detectors use. Never let two consecutive sentences be roughly the same length. After a long, dense sentence, follow with something punchy — five or six words. Occasionally use a deliberate fragment. Then stretch out again. The rhythm should feel like speech, not a conveyor belt.

2. NEVER REPEAT A SENTENCE SKELETON: If one sentence follows "X does Y, while Z does W," the next must use a completely different grammatical shape. Split it, invert it, start with the object, use a question — anything but mirroring the previous structure.

3. ACTIVE VERBS OVER ABSTRACT NOUNS: Replace nominalizations aggressively. "A reduction in the discount rate decreases the LCOE" → "Drop the discount rate and LCOE falls with it." "The relationship between X and Y" → "X drives Y" or "X and Y move together." This alone destroys half of all AI tells.

4. INJECT GENUINE HUMAN REACTIONS: Sprinkle in natural asides that show a thinking person behind the text: "what stands out here," "that's worth flagging," "interestingly enough," "and this part surprised me," "look at it this way." Use them sparingly — one every 2-3 paragraphs — but they must feel organic, not formulaic.

5. VARY YOUR HEDGING: Do NOT use "however," "it should be noted that," "it is important to mention" more than once each in the entire output. State some claims plainly and let them land. Let some sentences simply end without qualification.

6. MIX CITATION/EVIDENCE INTRODUCTION STYLES: Don't always lead with the author name. Alternate between: leading with the finding ("NPC came out favorable, according to..."), leading with contrast ("A different picture emerged when..."), and embedding the source mid-sentence.

7. CUT STIFF CONNECTIVE TISSUE: Eliminate or replace "thereby," "thus," "in order to," "furthermore," "additionally," "consequently" with natural transitions or just end the sentence and start fresh. Real writers don't chain clauses with formal connectors — they use periods.

8. USE DASHES AND COLONS FOR SPOKEN RHYTHM: Instead of burying key data in parentheses, use em dashes or trailing clauses: "— roughly 11.2%, if you want the number" reads far more human than "(11.2%)."

9. STRATEGIC IMPERFECTION: Occasionally start a sentence with "And" or "But." Use a contraction where it feels natural ("it's" instead of "it is," "doesn't" instead of "does not"). Drop in a rhetorical question once or twice. These small imperfections are exactly what detectors look for as proof of human authorship.

10. PARAGRAPH LENGTH VARIATION: Mix short 1-2 sentence paragraphs with longer 4-5 sentence ones. AI text tends to produce uniform paragraph blocks. Break that pattern deliberately.

ABSOLUTE RULES:
- Preserve ALL facts, statistics, citations, and technical accuracy from the original.
- Do NOT add new information or opinions not present in the original.
- Do NOT use these banned AI-tell words anywhere: "delve," "tapestry," "landscape," "testament," "crucial," "vital," "moreover," "underscores," "multifaceted," "comprehensive," "nuanced," "paradigm," "synergy," "leveraging," "groundbreaking," "embark."
- Output ONLY the rewritten text. No preamble, no "Here is the rewritten version," no closing remarks.
- The rewritten text must be roughly the same length as the input — do not summarize or truncate.`
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
        temperature: action === 'humanize' ? 0.9 : 0.7,
        max_tokens: action === 'humanize' ? 4000 : 2000,
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
