import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, chatbotId } = await request.json()

    if (!documentId || !chatbotId) {
      return NextResponse.json({ error: 'Missing documentId or chatbotId' }, { status: 400 })
    }

    // Verify ownership
    const { data: bot, error: botErr } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single()

    if (botErr || !bot) {
      return NextResponse.json({ error: 'Chatbot not found or unauthorized' }, { status: 403 })
    }

    // Delete the document (ON DELETE CASCADE will automatically wipe the associated embeddings)
    const { error: deleteErr } = await supabase
      .from('chatbot_documents')
      .delete()
      .eq('id', documentId)
      .eq('chatbot_id', chatbotId)

    if (deleteErr) {
      throw deleteErr
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
