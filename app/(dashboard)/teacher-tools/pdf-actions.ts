'use server'

export async function identifySOWsInChunk(textChunk: string) {
  try {
    const prompt = `
You are an expert AI assisting Nigerian teachers. I am providing you with a chunk of raw text extracted from a PDF curriculum document (NERDC Scheme of Work).
The text might be messy because it was extracted from tables. It will contain Weeks, Topics, Contents, etc.

Your job is to find ANY Scheme of Work content in this text, even if partial.

For each Scheme of Work content block you find, extract:
1. "subject": The Subject (e.g., English Studies). If not explicitly stated in this chunk, guess from context or use "Unknown".
2. "class_level": The Class Level (e.g., JSS 1, SS 2). If not found, use "Unknown".
3. "term": The Term (First Term, Second Term, Third Term). If not found, use "Unknown".
4. "raw_text": The VERBATIM text content of the scheme (weeks, topics, etc.). Capture ALL curriculum rows you see!

Return ONLY a valid JSON object with a single key "data". The value of "data" must be an array of objects with the exact keys: "subject", "class_level", "term", "raw_text".
Example output format:
{
  "data": [
    {
      "subject": "English Studies",
      "class_level": "JSS 1",
      "term": "First Term",
      "raw_text": "Week 1: Speech Work... Grammar... Week 2: Vowel Sounds..."
    }
  ]
}
If you find absolutely NO curriculum content at all, return { "data": [] }.

Text Chunk:
${textChunk}
`

    const apiKey = (process.env.GROQ_API_KEY || '').trim()

    if (!apiKey) {
      throw new Error('GROQ_API_KEY is missing in environment variables.')
    }
    
    const candidateModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
    let parsed: any = null

    for (const model of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
        })

        if (response.ok) {
          const data = await response.json()
          let text = data.choices?.[0]?.message?.content || ''
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim()
          parsed = JSON.parse(text)
          if (parsed && Array.isArray(parsed.data)) {
            break
          }
        }
      } catch (e) {}
    }

    if (!parsed) {
      throw new Error('Failed to extract curriculum data from AI.')
    }

    return parsed
  } catch (error: any) {
    console.error('Extraction Error:', error)
    return { data: [], error: error.message }
  }
}
