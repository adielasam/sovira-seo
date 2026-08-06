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

    // Capture City from Vercel header for Social Proof widget
    const city = req.headers.get('x-vercel-ip-city') || null

    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        action,
        details: details || {},
        city: city
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

    // Phase 4: Update last_active_at on user_profiles for lifecycle emails
    const meaningfulActions = ['audit-run', 'content-generated', 'file-analyzed', 'humanizer-used', 'detector-used', 'tutor-used', 'video-generated', 'image-generated', 'keywords-tracked']
    // If it's a known meaningful action or not explicitly excluded like login/logout/pageview
    if (action !== 'login' && action !== 'logout' && action !== 'pageview') {
      await supabase.from('user_profiles').update({
        last_active_at: new Date().toISOString()
      }).eq('id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in log-activity route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
