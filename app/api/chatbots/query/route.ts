import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { streamText, embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY || '' })

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
    const { embedding } = await embed({
      model: google.textEmbeddingModel('gemini-embedding-001'),
      value: lastMessage.content
    })
    
    if (!embedding) {
      throw new Error('Failed to generate embedding for query')
    }

    // 4. Similarity Search in Vector DB
    const { data: matchedDocuments, error: matchError } = await adminSupabase.rpc('match_chatbot_embeddings', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
      p_chatbot_id: chatbotId
    })

    if (matchError) {
      console.error('Vector search error:', matchError)
      throw new Error('Failed to search knowledge base')
    }

    // 5. Build Context
    let contextText = ''
    if (matchedDocuments && matchedDocuments.length > 0) {
      contextText = matchedDocuments.map((doc: any) => doc.content).join('\n\n---\n\n')
    }

    // 6. Build the System Prompt
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

    // 7. Stream response using Gemini
    const result = await streamText({
      model: google('gemini-1.5-flash'),
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

    return result.toDataStreamResponse()

  } catch (error: any) {
    console.error('Chatbot Query Error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
