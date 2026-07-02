import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: keywordId } = await params
    
    if (!keywordId) {
      return NextResponse.json({ error: 'Keyword ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Instead of a hard delete, we can soft delete or hard delete based on preference.
    // The prompt says "removes a keyword and its history". With ON DELETE CASCADE on the FK, a hard delete of the keyword removes history.
    const { error } = await supabase
      .from('tracked_keywords')
      .delete()
      .eq('id', keywordId)
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete Keyword Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete keyword' }, { status: 500 })
  }
}
