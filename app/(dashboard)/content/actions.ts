'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkUsageLimit } from '@/lib/usage'

export async function generateContentAction(topic: string, type: string, tone: string, length: string) {
  const NARA_API_KEY = process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'
  if (!NARA_API_KEY) {
    return { error: 'Nara API key is not configured' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { limitReached } = await checkUsageLimit(user.id, 'generation')
    if (limitReached) {
      return { error: 'LIMIT_REACHED', message: 'You have reached your Free plan content limit.' }
    }
  }

  try {
    const prompt = `You are an expert SEO content writer. Generate high-quality, SEO-optimized content based on the following parameters:
    Topic/Keyword: ${topic}
    Content Type: ${type}
    Tone: ${tone}
    Target Length: ${length}
    
    CRITICAL FORMATTING RULES:
    1. USE Markdown formatting! Use # for H1, ## for H2, ### for H3.
    2. Use bolding (**bold**) for important keywords, and bullet points for lists.
    3. Do not include markdown wrappers like \`\`\`markdown, just return the raw markdown text.
    
    WRITING STYLE GUIDELINES:
    1. Write naturally, as a human writer would.
    2. AVOID generic AI patterns like "In today's fast-paced world," "Whether you're looking to X, Y, or Z," or "Let's dive in."
    3. Vary sentence length and structure — mix short punchy sentences with longer ones, rather than uniform sentence lengths throughout.
    4. Sound like a knowledgeable person writing conversationally.`

    const response = await fetch(`https://router.bynara.id/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NARA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (!text) throw new Error('No content returned from Nara')

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

  const { data: newRows, error } = await supabase
    .from('content_generations')
    .insert([{ user_id: user.id, ...data }])
    .select('id')

  if (error) {
    console.error('Error saving generation to DB:', error)
    return { error: error.message }
  }
  
  const insertedId = newRows?.[0]?.id
  
  // Log the activity
  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action: 'Content Generated',
    details: { topic: data.topic, type: data.content_type }
  }])
  
  console.log(`[SAVE TRACE] Successfully saved generation for user ${user.id} with topic ${data.topic}`)

  revalidatePath('/content')
  revalidatePath('/admin/activity')
  return { success: true, id: insertedId }
}

export async function getRecentGenerations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: [] }

  const { data, error } = await supabase
    .from('content_generations')
    .select('*')
    .eq('user_id', user.id)
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

export async function updateGeneration(id: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('content_generations')
    .update({ generated_content: content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating generation:', error)
    return { error: error.message }
  }

  revalidatePath('/content')
  return { success: true }
}

export async function generateBriefAction(topic: string) {
  const NARA_API_KEY = process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'
  if (!NARA_API_KEY) {
    return { error: 'Nara API key is not configured' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { limitReached } = await checkUsageLimit(user.id, 'generation')
    if (limitReached) {
      return { error: 'LIMIT_REACHED', message: 'You have reached your Free plan generation limit.' }
    }
  }

  try {
    const prompt = `You are an expert SEO strategist. Create a comprehensive SEO content brief for the topic: "${topic}".
    
    You must return a clean, valid JSON object (no markdown formatting, no \`\`\`json wrappers) matching exactly this schema:
    {
      "h1": "String (The optimized H1 title)",
      "metaDescription": "String (150-160 characters)",
      "headings": [
        { "level": "H2", "text": "String" },
        { "level": "H3", "text": "String" }
      ],
      "lsiKeywords": ["String", "String", ... (exactly 10 keywords)],
      "targetWordCount": Number (e.g. 1500)
    }`

    const response = await fetch(`https://router.bynara.id/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NARA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mimo-2.5-hermes',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content
    
    if (!text) throw new Error('No brief returned from Nara')
    
    // Clean up any potential markdown formatting the AI might still add
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    
    const parsedJson = JSON.parse(text)
    return { data: parsedJson }
  } catch (error: any) {
    console.error('Gemini error:', error)
    return { error: error.message || 'Failed to generate brief' }
  }
}

export async function publishToWordPressAction(title: string, markdownContent: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch WP credentials
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('wp_url, wp_username, wp_app_password')
    .eq('id', user.id)
    .single()

  if (error || !profile || !profile.wp_url || !profile.wp_username || !profile.wp_app_password) {
    return { error: 'WordPress credentials not found. Please connect your site in the Integrations tab.' }
  }

  // Basic markdown to HTML conversion for WordPress
  let htmlContent = markdownContent
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p>')
  htmlContent = `<p>${htmlContent}</p>`

  const wpEndpoint = `${profile.wp_url}/wp-json/wp/v2/posts`
  const credentials = Buffer.from(`${profile.wp_username}:${profile.wp_app_password}`).toString('base64')

  try {
    const response = await fetch(wpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        title: title,
        content: htmlContent,
        status: 'draft' // Create as draft as requested
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('WP API Error:', data)
      return { error: data.message || `WordPress API returned ${response.status}` }
    }

    // Log successful publish
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Published to WordPress',
      details: { url: profile.wp_url, postId: data.id }
    }])

    return { success: true, url: data.link }
  } catch (err: any) {
    console.error('WP Publish Error:', err)
    return { error: 'Failed to communicate with WordPress site. Please check your URL and credentials.' }
  }
}
