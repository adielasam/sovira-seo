import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { streamText, embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

const google = createGoogleGenerativeAI({ 
  apiKey: GEMINI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta'
})

const groq = createGroq({ apiKey: GROQ_API_KEY || '' })

export async function POST(request: Request) {
  try {
    const { messages, chatbotId } = await request.json()

    if (!messages || !chatbotId) {
      return new NextResponse('Missing messages or chatbotId', { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Get Chatbot Settings
    const { data: bot, error: botErr } = await adminSupabase
      .from('chatbots')
      .select('name, system_prompt, webhook_url')
      .eq('id', chatbotId)
      .single()

    if (botErr || !bot) {
      return new NextResponse('Chatbot not found', { status: 404 })
    }

    // 2. Extract latest user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return new NextResponse('Latest message must be from user', { status: 400 })
    }

    // 3. Generate Embedding for the query using Gemini API
    //    (must match the embedding model used during training)
    let embedding: number[] | null = null
    
    if (GEMINI_API_KEY) {
      try {
        const result = await embed({
          model: google.textEmbeddingModel('gemini-embedding-001'),
          value: lastMessage.content
        })
        embedding = result.embedding
      } catch (embedErr: any) {
        console.warn('Gemini embedding failed:', embedErr?.message)
        // Continue without RAG context if embedding fails
      }
    }

    // 4. Similarity Search in Vector DB (only if we have a valid embedding)
    let contextText = ''
    if (embedding && embedding.length > 0) {
      const { data: matchedDocuments, error: matchError } = await adminSupabase.rpc('match_chatbot_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5,
        p_chatbot_id: chatbotId
      })

      if (matchError) {
        console.error('Vector search error:', matchError)
        // Don't throw — just continue without context
      } else if (matchedDocuments && matchedDocuments.length > 0) {
        contextText = matchedDocuments.map((doc: any) => doc.content).join('\n\n---\n\n')
      }
    }

    // 5. Build the System Prompt
    const systemPrompt = `
You are an AI assistant named ${bot.name}.
${bot.system_prompt || 'You are a helpful assistant. Use the provided context to answer questions.'}

--- KNOWLEDGE BASE CONTEXT ---
The following information has been retrieved from the official knowledge base. 
If the information answers the user's question, use it. If not, state that you do not have that information.
${contextText ? contextText : 'No relevant information found in the knowledge base.'}
------------------------------

IMPORTANT INSTRUCTIONS:
- Answer ONLY based on the provided context if possible.
- Be concise, helpful, and professional.
- If the user provides an email address, acknowledge it nicely. (We will process it in the background).
`

    // 6. Stream response — use Groq (fast) for LLM generation, fallback to Gemini
    //    Groq models: openai/gpt-oss-20b is fastest, openai/gpt-oss-120b is smartest
    const candidateConfigs = [
      { provider: 'groq', model: groq('openai/gpt-oss-20b') },
      { provider: 'groq', model: groq('openai/gpt-oss-120b') },
      ...(GEMINI_API_KEY ? [{ provider: 'gemini', model: google('gemini-2.0-flash') }] : []),
    ]

    let streamResult: any = null
    for (const config of candidateConfigs) {
      try {
        streamResult = await streamText({
          model: config.model,
          system: systemPrompt,
          messages: messages,
          onFinish: async ({ text }) => {
            // Optional Webhook Trigger Logic
            if (bot.webhook_url) {
              const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
              const emailMatch = lastMessage.content.match(emailRegex) || text.match(emailRegex)
              if (emailMatch) {
                try {
                  await fetch(bot.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event: 'lead_captured',
                      chatbot_name: bot.name,
                      email: emailMatch[0],
                      transcript: [...messages, { role: 'assistant', content: text }]
                    })
                  })
                } catch (e) {
                  console.error('Failed to trigger webhook:', e)
                }
              }
            }
          }
        })
        break // Success — stop trying
      } catch (modelErr: any) {
        console.warn(`Model ${config.provider} failed:`, modelErr?.message)
      }
    }

    if (!streamResult) {
      return new NextResponse('AI service temporarily unavailable. Please try again.', { status: 502 })
    }

    return streamResult.toDataStreamResponse()

  } catch (error: any) {
    console.error('Chatbot Query Error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
