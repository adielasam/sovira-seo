import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, details } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    // Capture IP and User Agent if possible
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        action,
        details: details || {},
        ip_address: ip,
        user_agent: userAgent
      }])

    if (error) {
      console.error('Error logging activity:', error)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }

    // Convert dashboard activities into personal notifications (skip login/logout)
    if (action !== 'login' && action !== 'logout') {
      const titleParts = action.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      const title = titleParts.join(' ')
      
      await supabase.from('notifications').insert([{
        user_id: user.id,
        title: title,
        message: details?.message || `You performed: ${title}`,
        type: details?.type || 'info', // 'success', 'info', 'warning'
        is_global: false,
        is_read: false
      }])
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in log-activity route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
