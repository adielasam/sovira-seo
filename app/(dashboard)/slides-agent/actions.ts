'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'

export type SlideLayout = 'title' | 'content' | 'two-column' | 'quote'

export interface TitleSlideData {
  id: string
  layout: 'title'
  title: string
  subtitle: string
}

export interface ContentSlideData {
  id: string
  layout: 'content'
  title: string
  bullets: string[]
}

export interface TwoColumnSlideData {
  id: string
  layout: 'two-column'
  title: string
  left: { heading: string; bullets: string[] }
  right: { heading: string; bullets: string[] }
}

export interface QuoteSlideData {
  id: string
  layout: 'quote'
  quote: string
  attribution: string
}

export type SlideData = TitleSlideData | ContentSlideData | TwoColumnSlideData | QuoteSlideData

export interface DeckJSON {
  title: string
  slides: SlideData[]
}

export async function generateSlideDeck(topic: string, slideCount: number, theme?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Please log in to generate slides.' }
  }

  const { limitReached } = await checkUsageLimit(user.id, 'slides')
  if (limitReached) {
    return { error: 'LIMIT_REACHED' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: 'AI service is not configured. Please contact support.' }
  }

  const aiClient = new GoogleGenerativeAI(apiKey)
  const model = aiClient.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  })

  const prompt = `You are a professional presentation designer. Generate a presentation deck about: "${topic}".

Generate exactly ${slideCount} slides.
${theme ? `Style/Tone: ${theme}` : ''}

The JSON must follow this exact schema:
{
  "title": "Deck title string",
  "slides": [
    { "id": "slide-1", "layout": "title", "title": "Presentation Title", "subtitle": "Subtitle text" },
    { "id": "slide-2", "layout": "content", "title": "Section Title", "bullets": ["Detailed sentence 1", "Detailed sentence 2", "Detailed sentence 3"] },
    { "id": "slide-3", "layout": "two-column", "title": "Comparison Title", "left": { "heading": "Left Heading", "bullets": ["Point 1", "Point 2"] }, "right": { "heading": "Right Heading", "bullets": ["Point 1", "Point 2"] } },
    { "id": "slide-4", "layout": "quote", "quote": "An impactful quote related to the topic", "attribution": "Author Name" }
  ]
}

Rules:
- Use a MIX of all 4 layout types: "title", "content", "two-column", "quote"
- The first slide MUST be layout "title"
- The last slide should be a conclusion (layout "content") or an inspiring quote (layout "quote")
- Include at least one "two-column" slide for comparisons or contrasts
- Include at least one "quote" slide with a real or relevant quotation
- Each bullet point must be a substantive, detailed sentence of 20-40 words — NOT short phrases or single words
- All content must be factual, informative, and academically sound
- Slide IDs must be sequential: "slide-1", "slide-2", etc.`

  async function callModel(currentPrompt: string): Promise<string> {
    const response = await model.generateContent(currentPrompt)
    let text = response.response.text()
    // Fallback cleanup just in case, though responseMimeType should prevent markdown fences
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    return text
  }

  try {
    let text = await callModel(prompt)
    const deck: DeckJSON = JSON.parse(text)

    if (!deck.title || !Array.isArray(deck.slides) || deck.slides.length === 0) {
      throw new Error('Invalid deck structure')
    }

    return { deck }
  } catch {
    try {
      const retryPrompt = prompt + '\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no code fences, no explanation, no text before or after the JSON.'
      let text = await callModel(retryPrompt)
      const deck: DeckJSON = JSON.parse(text)

      if (!deck.title || !Array.isArray(deck.slides) || deck.slides.length === 0) {
        throw new Error('Invalid deck structure on retry')
      }

      return { deck }
    } catch {
      return { error: 'Failed to generate slides. The AI returned an invalid format. Please try again with a simpler topic.' }
    }
  }
}
