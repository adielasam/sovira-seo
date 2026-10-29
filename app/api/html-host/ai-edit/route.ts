import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkFreeToolDailyUsage } from '@/lib/usage'

export const maxDuration = 60 // Allow longer execution for AI code generation

export async function POST(req: Request) {
  try {
    const { currentHtml, prompt, slug } = await req.json()

    if (!currentHtml || !prompt) {
      return NextResponse.json({ error: 'currentHtml and prompt are required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    if (!currentUser) {
      return NextResponse.json({ error: 'Please create a free account or log in to use the AI Edit tool.' }, { status: 401 })
    }

    const { allowed, maxLimit, isPaid } = await checkFreeToolDailyUsage(currentUser.id, 'ai_edit')

    if (!allowed) {
      const msg = isPaid
        ? `You have reached your daily limit of ${maxLimit} AI edits.`
        : `You have reached your daily limit of ${maxLimit} uses on the Free plan. Please upgrade to a paid plan.`
      return NextResponse.json({ error: msg }, { status: 429 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI provider is not configured. Please contact support.' }, { status: 500 })
    }

    const systemPrompt = {
      role: 'system',
      content: `You are an expert web developer and designer. You are modifying a single-file HTML website.
Your task is to take the user's prompt and apply the requested changes to the provided HTML code.
CRITICAL INSTRUCTIONS:
1. Output ONLY the raw HTML code. Do NOT wrap it in markdown code blocks like \`\`\`html.
2. Do not include any explanations, pleasantries, or extra text.
3. Ensure the output is a complete, valid HTML document.
4. Keep all existing functionality, links, scripts, and styles intact unless the user explicitly asks to change them.`
    }

    const userMessage = {
      role: 'user',
      content: `Here is the current HTML code:

${currentHtml}

User's requested changes: ${prompt}

Return the updated HTML code:`
    }

    // Try primary high-performance model, with resilient fallbacks
    const candidateModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
    let reply = ''
    let usedModel = ''

    for (const model of candidateModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [systemPrompt, userMessage],
            temperature: 0.2, // Low temperature for deterministic code generation
            max_tokens: 8192
          })
        })

        if (res.ok) {
          const data = await res.json()
          const content = data.choices?.[0]?.message?.content
          if (content && content.trim().length > 0) {
            reply = content
            usedModel = model
            break
          }
        } else {
          const errText = await res.text()
          console.warn(`Groq model ${model} failed (${res.status}):`, errText)
        }
      } catch (err) {
        console.warn(`Groq model ${model} error:`, err)
      }
    }

    if (!reply) {
      return NextResponse.json({ error: 'AI service temporarily unavailable. Please try again in a few moments.' }, { status: 502 })
    }

    // Clean up potential markdown formatting just in case the model ignores the instruction
    reply = reply.trim()
    if (reply.startsWith('```html')) {
      reply = reply.substring(7)
    } else if (reply.startsWith('```')) {
      reply = reply.substring(3)
    }
    if (reply.endsWith('```')) {
      reply = reply.substring(0, reply.length - 3)
    }
    reply = reply.trim()

    // Log this AI Edit execution to track limits
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    await supabaseAdmin
      .from('activity_logs')
      .insert([{
        user_id: currentUser.id,
        action: 'HTML AI Edit',
        details: { prompt: prompt, model: usedModel, ip: ip, slug: slug || 'new' }
      }])

    return NextResponse.json({ updatedHtml: reply })
    
  } catch (error) {
    console.error('AI Edit API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
