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
    
    Ensure the content is well-structured, engaging, and directly targets the keyword. Do not include markdown wrappers like \`\`\`markdown, just return the raw text formatting.`

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
    const text = data.choices[0]?.message?.content

    if (!text) throw new Error('No content returned from Groq')

    return { content: text }
  } catch (error: any) {
    console.error('Error generating content:', error)
    return { error: error.message || 'Failed to generate content' }
  }
}
