'use server'



export async function identifySOWsInChunk(textChunk: string) {
  try {
    const prompt = `
You are an expert AI assisting Nigerian teachers. I am providing you with a chunk of raw text extracted from a massive PDF curriculum document (NERDC Scheme of Work).
Your job is to identify every unique Scheme of Work block present in this text.

For each Scheme of Work you find, extract:
1. The Subject (e.g., Mathematics, English Studies, Basic Science)
2. The Class Level (e.g., JSS 1, SS 2)
3. The Term (First Term, Second Term, Third Term)
4. The exact verbatim text content of the scheme for that term (including weeks, topics, objectives, etc.)

Return ONLY a valid JSON object with a single key "data". The value of "data" must be an array of objects with these keys: "subject", "class_level", "term", "raw_text".
If you find none, return { "data": [] }.
Do not include markdown blocks like \`\`\`json. Return raw JSON.

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
