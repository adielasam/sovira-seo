import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
export const maxDuration = 60; // Allow maximum Vercel duration

const openai = new OpenAI({
  baseURL: 'https://api.agentrouter.org/v1',
  apiKey: 'sk-FkKCSzDok8WPoKgK3YhhPtJgM9DIcTajHwFQOef0gfhIH39l'
})

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize))
    i += chunkSize - overlap
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    // Dynamically require pdf-parse inside the handler to prevent Vercel Serverless crashes on startup
    const pdfParse = require('pdf-parse')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatbotId = formData.get('chatbotId') as string

    if (!file || !chatbotId) {
      return NextResponse.json({ error: 'Missing file or chatbotId' }, { status: 400 })
    }

    // Verify ownership of chatbot
    const { data: bot, error: botErr } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single()

    if (botErr || !bot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 403 })
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdfParse(buffer)
    const rawText = pdfData.text

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 })
    }

    // Record document in DB
    await supabase.from('chatbot_documents').insert({
      chatbot_id: chatbotId,
      file_name: file.name,
      status: 'processed'
    })

    // Chunk text
    const chunks = chunkText(rawText)

    // Generate Embeddings in batches to avoid OpenAI rate limits
    const BATCH_SIZE = 50
    let totalInserted = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE)
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batchChunks,
      })

      const recordsToInsert = batchChunks.map((content, idx) => ({
        chatbot_id: chatbotId,
        content: content.trim(),
        embedding: embeddingResponse.data[idx].embedding
      })).filter(record => record.content.length > 0)

      if (recordsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('chatbot_embeddings')
          .insert(recordsToInsert)

        if (insertErr) {
          console.error('Error inserting embeddings:', insertErr)
          throw new Error('Failed to save embeddings to database: ' + insertErr.message)
        }
        totalInserted += recordsToInsert.length
      }
    }

    return NextResponse.json({ success: true, chunksProcessed: totalInserted })
  } catch (error: any) {
    console.error('Error training chatbot:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
