'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateContentAction(topic: string, type: string, tone: string, length: string) {
  if (!process.env.GEMINI_API_KEY) {
    return { error: 'Gemini API key is not configured' }
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are an expert SEO content writer. Generate high-quality, SEO-optimized content based on the following parameters:
    Topic/Keyword: ${topic}
    Content Type: ${type}
    Tone: ${tone}
    Target Length: ${length}
    
    Ensure the content is well-structured, engaging, and directly targets the keyword. Do not include markdown wrappers like \`\`\`markdown, just return the raw text formatting.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return { content: text }
  } catch (error: any) {
    console.error('Error generating content:', error)
    return { error: error.message || 'Failed to generate content' }
  }
}
