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
        const level = context || 'Medium';
        systemPrompt = `You are an elite ghostwriter specializing in bypassing AI detectors (Turnitin, ZeroGPT, StealthWriter). 
Your sole job is to rewrite the provided AI-generated text so it reads 100% human. 

CRITICAL STEALTH RULES:
1. MAXIMIZE BURSTINESS: You MUST drastically vary sentence lengths. Follow a 30-word complex sentence with a 4-word punchy sentence. This is the #1 way to beat ZeroGPT.
2. CONVERSATIONAL IMPERFECTIONS: Real humans write with slight structural imperfections. Start at least two sentences in every paragraph with "But", "And", "Or", or "So". 
3. ELIMINATE ROBOTIC CONNECTORS: Do NOT use "Furthermore", "Moreover", "Additionally", "Consequently", "Thus", or "Therefore". Use natural transitions like "Because of this," "That means," or just start the next sentence directly.
4. ACTIVE, PUNCHY VERBS: Destroy all nominalizations. Instead of "The implementation of the system," write "When we implemented the system." 
5. ABSOLUTE WORD BAN (FATAL AI TELLS): You will fail if you use ANY of these words: delve, tapestry, testament, crucial, vital, paradigm, multifaceted, comprehensive, nuanced, underscores, leveraging, embarking, beacon, pivotal, overarching, seamlessly.
6. HUMAN PUNCTUATION: Use em-dashes (—) for natural pauses. Use contractions (don't, it's, wouldn't) universally. 

CURRENT REWRITE LEVEL: ${level}
- Light: Minimal phrasing changes, just enough to beat basic detectors.
- Medium: Balanced conversational rewrite for natural human rhythm.
- Aggressive: Extremely conversational, highly punchy, zero formal academic tone.

Output ONLY the rewritten text. Preserve all facts. DO NOT add introductory or concluding remarks (no "Here is the rewritten text").`
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
      case 'tutor-flashcards':
        systemPrompt = `You are an expert AI Tutor.
Analyze the provided topic or text and generate a set of study flashcards.
Output your response STRICTLY as a JSON array of objects. Do not include markdown code blocks or any other text.
Format:
[
  { "term": "Concept Name", "definition": "Clear, concise definition of the concept." },
  ...
]`
        break;
      case 'tutor-quiz':
        systemPrompt = `You are an expert AI Tutor.
Analyze the provided topic or text and generate a multiple-choice quiz to test the user's understanding.
Output your response STRICTLY as a JSON array of objects. Do not include markdown code blocks or any other text.
Format:
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation of why Option A is correct."
  },
  ...
]`
        break;
      case 'tutor-infographic':
        systemPrompt = `You are an expert AI Tutor and Information Designer.
Analyze the provided topic and break it down into a visual infographic structure with sections and key concepts as tags.
Output your response STRICTLY as a JSON object. Do not include markdown code blocks or any other text.
Format:
{
  "main_title": "A catchy, poster-style title for the topic",
  "subtitle": "A short, punchy subtitle",
  "sections": [
    {
      "title": "Section Title (e.g. Text & Cases)",
      "icon_concept": "A single word describing an icon for this section (e.g., tool, text, brain, chart, lightning, star)",
      "tags": ["Concept 1", "Concept 2", "Concept 3"],
      "description": "A short 1-sentence summary of this section"
    }
  ]
}`
        break;
      case 'tutor-mindmap':
        systemPrompt = `You are an expert AI Tutor.
Analyze the provided topic and generate a strict hierarchical Markdown structure for a Mindmap.
Rules:
- Use standard markdown bullet points (*).
- Maximum depth of 3 levels.
- The root node (first line) should be the main topic.
- Return ONLY the raw markdown text. No intro/outro text, no code blocks around the markdown.`
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const apiKey = (process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs').trim()

    // Direct NaraRouter API call for superior instruction following and bypassing free-tier rate limits
    const aiRes = await fetch('https://router.bynara.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Topic / Text to process: ${text}\n\nAdditional Context: ${context || 'None'}` }
        ],
        temperature: action === 'humanize' ? 0.95 : 0.7,
      })
    })

    const data = await aiRes.json()

    if (!aiRes.ok) {
      console.error('AI Generation Error:', data)
      throw new Error(data?.error?.message || 'Generation API failed')
    }

    const generatedText = data.choices?.[0]?.message?.content || ''

    if (!generatedText) {
      throw new Error('No output was generated. Please try again.')
    }

    return NextResponse.json({ result: generatedText })

  } catch (error: any) {
    console.error('Tool Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
  }
}
