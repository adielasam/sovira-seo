'use server'

export async function generateContentAction(topic: string, type: string, tone: string, length: string) {
  if (!process.env.GROQ_API_KEY) {
    return { error: 'Groq API key is not configured' }
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    let text = data.choices[0]?.message?.content

    if (!text) throw new Error('No content returned from Groq')

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
