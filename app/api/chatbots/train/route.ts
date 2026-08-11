import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const pdfParse = require('pdf-parse')

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatbotId = formData.get('chatbotId') as string

    if (!file || !chatbotId) {
      return new NextResponse('Missing file or chatbotId', { status: 400 })
    }

    // Verify ownership of chatbot
    const { data: bot, error: botErr } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single()

    if (botErr || !bot) {
      return new NextResponse('Chatbot not found or unauthorized', { status: 403 })
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdfParse(buffer)
    const rawText = pdfData.text

    if (!rawText || rawText.trim().length === 0) {
      return new NextResponse('Could not extract text from PDF', { status: 400 })
    }

    // Record document in DB
    const adminSupabase = createAdminClient()
    await adminSupabase.from('chatbot_documents').insert({
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
      
      const requests = batchChunks.map(chunk => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: chunk }] }
      }))

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      })

      if (!geminiRes.ok) {
        const err = await geminiRes.text()
        console.error('Gemini Embed Error:', err)
        throw new Error('Failed to generate embeddings via Gemini')
      }

      const geminiData = await geminiRes.json()

      const recordsToInsert = batchChunks.map((content, idx) => ({
        chatbot_id: chatbotId,
        content: content.trim(),
        embedding: geminiData.embeddings[idx].values
      })).filter(record => record.content.length > 0)

      if (recordsToInsert.length > 0) {
        const { error: insertErr } = await adminSupabase
          .from('chatbot_embeddings')
          .insert(recordsToInsert)

        if (insertErr) {
          console.error('Error inserting embeddings:', insertErr)
          throw new Error('Failed to save embeddings to database')
        }
        totalInserted += recordsToInsert.length
      }
    }

    return NextResponse.json({ success: true, chunksProcessed: totalInserted })
  } catch (error: any) {
    console.error('Error training chatbot:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
