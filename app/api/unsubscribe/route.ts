import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function processSubscriptionChange({
  userId,
  email,
  optOut,
}: {
  userId?: string | null
  email?: string | null
  optOut: boolean
}) {
  const supabaseAdmin = getSupabaseAdmin()

  if (userId) {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ marketing_emails_opt_out: optOut })
      .eq('id', userId)

    if (error) throw error

    if (optOut) {
      await supabaseAdmin
        .from('report_schedules')
        .delete()
        .eq('user_id', userId)
    }
  } else if (email) {
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ marketing_emails_opt_out: optOut })
      .ilike('email', normalizedEmail)

    if (error) throw error

    if (optOut) {
      await supabaseAdmin
        .from('report_schedules')
        .delete()
        .ilike('emails', `%${normalizedEmail}%`)
    }
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const email = searchParams.get('email')

  if (!userId && !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
  }

  try {
    await processSubscriptionChange({ userId, email, optOut: true })
    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error) {
    console.error('One-click unsubscribe error:', error)
    return NextResponse.json({ error: 'Error processing unsubscribe request' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const userId = searchParams.get('userId')
  const email = searchParams.get('email')
  const resubscribe = searchParams.get('resubscribe') === 'true'

  if (!userId && !email) {
    return new NextResponse('Invalid request: Missing userId or email', { status: 400 })
  }

  try {
    await processSubscriptionChange({
      userId,
      email,
      optOut: !resubscribe,
    })

    const queryIdent = userId
      ? `userId=${encodeURIComponent(userId)}`
      : `email=${encodeURIComponent(email!)}`
    const toggleUrl = `${origin}/api/unsubscribe?${queryIdent}${resubscribe ? '' : '&resubscribe=true'}`

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${resubscribe ? 'Subscribed' : 'Unsubscribed'} - Sovira SEO</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f8fafc; margin: 0; padding: 20px; box-sizing: border-box; }
            .container { background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); text-align: center; max-width: 500px; width: 100%; }
            .badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background-color: ${resubscribe ? '#dcfce7' : '#e0f2fe'}; color: ${resubscribe ? '#16a34a' : '#0284c7'}; font-size: 24px; margin-bottom: 16px; }
            h1 { color: #0f172a; margin: 0 0 12px; font-size: 24px; }
            p { color: #64748b; line-height: 1.6; margin: 0 0 24px; font-size: 15px; }
            .actions { display: flex; flex-direction: column; gap: 12px; align-items: center; }
            .btn-primary { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
            .btn-secondary { color: #64748b; text-decoration: underline; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">${resubscribe ? '✓' : '✉️'}</div>
            <h1>${resubscribe ? "You're subscribed again" : "You've been unsubscribed"}</h1>
            <p>${
              resubscribe
                ? 'You have opted back in to receive automated updates, SEO tips, and promotional emails from Sovira SEO.'
                : 'You have successfully unsubscribed from Sovira SEO automated, promotional, and reminder emails. You will only receive essential security or account-critical messages.'
            }</p>
            <div class="actions">
              <a class="btn-primary" href="${origin}">Return to Sovira SEO</a>
              <a class="btn-secondary" href="${toggleUrl}">${
                resubscribe ? 'Unsubscribe again' : 'Clicked by accident? Re-subscribe'
              }</a>
            </div>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse('Error processing unsubscribe request', { status: 500 })
  }
}
