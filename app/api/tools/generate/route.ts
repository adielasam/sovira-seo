import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit, checkFreeToolDailyUsage, FreeToolType } from '@/lib/usage'

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json()
    
    if (!action || !text) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const { limitReached, maxLimit, trialExpired } = await checkUsageLimit(user.id, 'seo')
    
    if (trialExpired) {
      return NextResponse.json({ error: 'Your 14-day free trial has expired. Please upgrade your plan to continue.' }, { status: 403 })
    }

    // Special checks for Free Tools Daily Limits
    if (action === 'humanize' || action.startsWith('tutor') || action === 'grammar') {
      const toolMap: Record<string, FreeToolType> = {
        'humanize': 'humanizer',
        'grammar': 'grammar'
      }
      const toolKey = toolMap[action] || 'tutor'
      const { allowed, maxLimit: dailyMax } = await checkFreeToolDailyUsage(user.id, toolKey)
      if (!allowed) {
        return NextResponse.json({ error: `You have reached your daily limit of ${dailyMax} uses on the Free plan. Please upgrade to a paid plan.` }, { status: 403 })
      }
    } else {
      if (limitReached) {
        return NextResponse.json({ error: `You have reached your daily limit (${maxLimit.toLocaleString()} generations). Please upgrade your plan.` }, { status: 403 })
      }
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
        systemPrompt = `You are an expert AI Tutor creating MULTI-PAGE academic presentation slides.
Each slide should cover ONE concept deeply — like a professor's lecture slides.
Generate 4-8 slides depending on topic complexity. Each slide gets its own full page.

Output STRICTLY as a JSON object. No markdown code blocks.
Format:
{
  "main_title": "Main presentation title (short, 4-8 words)",
  "subtitle": "A descriptive subtitle for the presentation",
  "golden_rule": "A memorable one-liner takeaway. Use arrows → between steps if applicable.",
  "slides": [
    {
      "slide_type": "concept | comparison | list | process",
      "title": "Slide heading (2-6 words)",
      "icon_concept": "One word for icon: tool, text, brain, chart, zap, star, search, shield, globe, database, code, users, target, book, cpu, eye, lock, refresh",
      "description": "2-3 sentence detailed explanation of this concept",
      "key_points": ["Point 1 with detail", "Point 2 with detail", "Point 3 with detail"],
      "analogy": "A real-world analogy to explain this concept (e.g. 'Like inspecting a basket of vegetables to find rotten items')",
      "pro_tip": "A practical pro tip or shortcut related to this slide",
      "left_label": "For comparison slides: left side label",
      "right_label": "For comparison slides: right side label",
      "left_emoji": "For comparison slides: 1-2 emojis representing the left concept (e.g. 🍅🔍)",
      "right_emoji": "For comparison slides: 1-2 emojis representing the right concept (e.g. 🔪🍅)",
      "items": [
        {
          "source": "For list/process slides: the source or step name",
          "solution": "The corresponding solution or result",
          "icon_concept": "icon keyword"
        }
      ]
    }
  ]
}

RULES:
- slide_type "concept": A single concept with description, key_points, analogy, pro_tip
- slide_type "comparison": Two things compared side by side with left_label, right_label, description
- slide_type "list": A list of items with source→solution pairs (like the Source & Solution example)
- slide_type "process": Step-by-step process with items array
- Mix different slide_types for visual variety
- Make content EDUCATIONAL and DETAILED — this is for students`
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

    // Log the usage for Free Tools
    if (action === 'humanize' || action.startsWith('tutor') || action === 'grammar') {
      const actionMatch = action === 'humanize' ? 'Text Humanized' 
                        : action.startsWith('tutor') ? 'AI Tutor Query' 
                        : 'Grammar Check'
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: actionMatch, 
        details: { action, input_length: text.length }
      }])
    }

    return NextResponse.json({ result: generatedText })

  } catch (error: any) {
    console.error('Tool Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
  }
}
