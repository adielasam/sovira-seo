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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    })

    const data = await response.json()
    const resultText = data.choices?.[0]?.message?.content || '{"data": []}'
    
    // Because we used json_object format, we expect a JSON object. 
    // To ensure the array is returned, we should instruct the model to return { "data": [...] }
    const parsed = JSON.parse(resultText)
    
    // Handle both { data: [] } and direct array (fallback)
    const arrayResult = Array.isArray(parsed) ? parsed : (parsed.data || parsed.schemes || [])

    return { data: arrayResult }
  } catch (error: any) {
    console.error('Groq PDF Chunk Error:', error)
    return { error: error.message || 'Failed to analyze text chunk' }
  }
}
