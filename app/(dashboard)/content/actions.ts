'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateContentAction(topic: string, type: string, tone: string, length: string) {
  if (!process.env.GEMINI_API_KEY) {
    return { error: 'Gemini API key is not configured' }
  }

  try {
    const prompt = `You are an expert SEO content writer. Generate high-quality, SEO-optimized content based on the following parameters:
    Topic/Keyword: ${topic}
    Content Type: ${type}
    Tone: ${tone}
    Target Length: ${length}
    
    CRITICAL FORMATTING RULES:
    1. Do not use markdown formatting such as asterisks (**), pound signs (#), or underscores for emphasis or headings.
    2. Write in plain text only, using natural paragraph breaks and occasional line breaks for structure — no markdown syntax of any kind.
    3. Do not include markdown wrappers like \`\`\`markdown, just return the raw text.
    
    WRITING STYLE GUIDELINES:
    1. Write naturally, as a human writer would.
    2. AVOID generic AI patterns like "In today's fast-paced world," "Whether you're looking to X, Y, or Z," or "Let's dive in."
    3. Vary sentence length and structure — mix short punchy sentences with longer ones, rather than uniform sentence lengths throughout.
    4. Avoid repeating the same phrases, transition words, or sentence openers across paragraphs.
    5. Avoid overly formal or "listicle" phrasing unless the content type specifically calls for a list.
    6. Sound like a knowledgeable person writing conversationally, not like a corporate blog template.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) throw new Error('No content returned from Gemini')

    // Post-processing: safety net to strip leaked markdown characters
    text = text.replace(/\*\*/g, '')
    text = text.replace(/##/g, '')
    text = text.replace(/__/g, '')

    return { content: text }
  } catch (error: any) {
    console.error('Error generating content:', error)
    return { error: error.message || 'Failed to generate content' }
  }
}

export async function saveGeneration(data: { topic: string, content_type: string, tone: string, generated_content: string, word_count: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('content_generations')
    .insert([{ user_id: user.id, ...data }])

  if (error) {
    console.error('Error saving generation to DB:', error)
    return { error: error.message }
  }
  
  // Log the activity
  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action: 'Content Generated',
    details: { topic: data.topic, type: data.content_type }
  }])
  
  console.log(`[SAVE TRACE] Successfully saved generation for user ${user.id} with topic ${data.topic}`)

  revalidatePath('/content')
  revalidatePath('/admin/activity')
  return { success: true }
}

export async function getRecentGenerations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data, error } = await supabase
    .from('content_generations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching generations:', error)
    return { error: error.message, data: [] }
  }

  return { data }
}

export async function deleteGeneration(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('content_generations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting generation:', error)
    return { error: error.message }
  }

  revalidatePath('/content')
  return { success: true }
}
