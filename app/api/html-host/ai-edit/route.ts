import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 60 // Allow longer execution for AI code generation

export async function POST(req: Request) {
  try {
    const { currentHtml, prompt, slug } = await req.json()

    if (!currentHtml || !prompt) {
      return NextResponse.json({ error: 'currentHtml and prompt are required' }, { status: 400 })
    }

    // Optional: Log the edit action if the user is editing a published site
    if (slug && slug !== 'html-host' && slug !== 'sovira') {
      const supabaseAdmin = await createAdminClient()
      const { data: siteFiles } = await supabaseAdmin
        .from('content_generations')
        .select('user_id')
        .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
        .like('topic', `${slug}|%`)
        .limit(1)

      if (siteFiles && siteFiles.length > 0) {
        await supabaseAdmin
          .from('activity_logs')
          .insert([{
            user_id: siteFiles[0].user_id,
            action: `AI Edit: ${slug}`,
            details: { prompt: prompt, model: 'mistral-large' }
          }])
      }
    }

    const naraKey = process.env.NARA_API_KEY
    if (!naraKey) {
      return NextResponse.json({ error: 'NARA_API_KEY is not configured' }, { status: 500 })
    }

    const systemPrompt = {
      role: 'system',
      content: `You are an expert web developer and designer. You are modifying a single-file HTML website.
Your task is to take the user's prompt and apply the requested changes to the provided HTML code.
CRITICAL INSTRUCTIONS:
1. Output ONLY the raw HTML code. Do NOT wrap it in markdown code blocks like \`\`\`html.
2. Do not include any explanations, pleasantries, or extra text.
3. Ensure the output is a complete, valid HTML document.
4. Keep all existing functionality and styles intact unless the user explicitly asks to change them.`
    }

    const userMessage = {
      role: 'user',
      content: `Here is the current HTML code:

${currentHtml}

User's requested changes: ${prompt}

Return the updated HTML code:`
    }

    const res = await fetch('https://router.bynara.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${naraKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [systemPrompt, userMessage],
        temperature: 0.2, // Low temperature for more deterministic code generation
        max_tokens: 4000
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('NaraRouter AI Edit Error:', errorText)
      return NextResponse.json({ error: 'Upstream AI provider error' }, { status: 502 })
    }

    const data = await res.json()
    let reply = data.choices[0].message.content

    // Clean up potential markdown formatting just in case the model ignores the instruction
    if (reply.startsWith('\`\`\`html')) {
      reply = reply.substring(7)
    }
    if (reply.startsWith('\`\`\`')) {
      reply = reply.substring(3)
    }
    if (reply.endsWith('\`\`\`')) {
      reply = reply.substring(0, reply.length - 3)
    }

    return NextResponse.json({ updatedHtml: reply.trim() })
    
  } catch (error) {
    console.error('AI Edit API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
