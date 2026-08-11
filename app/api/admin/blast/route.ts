import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const maxDuration = 60 // Allow longer execution for email sending
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: users, error } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      
    if (error) throw error
    if (!users || users.length === 0) return NextResponse.json({ error: 'No users found' })

    const emailsSent = []
    
    // Deduplicate emails
    const uniqueUsers = Array.from(new Map(users.map(u => [u.email, u])).values())

    for (const user of uniqueUsers) {
      if (!user.email) continue
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Huge Updates on Sovira SEO! 🚀</h2>
          <p>Hi ${user.full_name || 'there'},</p>
          <p>We've just launched some amazing new features on Sovira to help you build and rank faster than ever!</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li><strong>Free Coding Agent:</strong> Build InstantSites instantly using simple AI prompts.</li>
              <li><strong>VS Code Interface:</strong> A professional HTML editor built right into your dashboard.</li>
              <li><strong>AI Tutor:</strong> Ask our AI assistant for help on coding, SEO, or writing anytime.</li>
              <li><strong>Text Humanizer & Grammar Checker:</strong> Polish your content directly inside the platform.</li>
            </ul>
          </div>
          
          <p>Log in now to try out these amazing new features for free!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://sovira.com.ng/dashboard" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
          
          <p>Happy building,<br>The Sovira Team</p>
        </div>
      `
      
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: 'Sovira SEO <onboarding@resend.dev>',
        to: [user.email],
        subject: '🚀 New Features: Free Coding Agent, AI Tutor, & More!',
        html: htmlContent,
      })
      
      if (sendError) {
        console.error('Failed to send to', user.email, sendError)
      } else {
        emailsSent.push(user.email)
      }
      
      // Basic rate limiting for Resend (avoid hitting limits if many users)
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return NextResponse.json({ success: true, count: emailsSent.length, emailsSent })
  } catch (error: any) {
    console.error('Blast error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
