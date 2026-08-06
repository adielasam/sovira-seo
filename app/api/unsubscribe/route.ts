import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new NextResponse('Invalid request: Missing userId', { status: 400 })
  }

  try {
    // We must use the admin client since the user is not authenticated in this GET request
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ marketing_emails_opt_out: true })
      .eq('id', userId)

    if (error) {
      console.error('Error updating opt_out:', error)
      return new NextResponse('Error processing unsubscribe request', { status: 500 })
    }

    // Return a simple success page
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8fafc; margin: 0; }
            .container { background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 500px; }
            h1 { color: #1e293b; margin-top: 0; }
            p { color: #64748b; line-height: 1.5; }
            a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You've been unsubscribed</h1>
            <p>You have successfully unsubscribed from Sovira SEO marketing and reengagement emails. You will still receive important transactional and security emails.</p>
            <a href="${origin}">Return to Sovira SEO</a>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
