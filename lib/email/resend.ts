import { Resend } from 'resend'

// The fallback 're_dummy' prevents Next.js build from crashing if the ENV var is missing during Vercel deployment
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build_bypass')
// Fallback to onboarding@resend.dev if domain isn't verified in Resend yet
const fromEmail = process.env.NODE_ENV === 'production' 
  ? 'Sovira <hello@sovira.com.ng>' 
  : 'Sovira <onboarding@resend.dev>'

export async function sendVerificationEmail(email: string, actionLink: string) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your email</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .logo { color: #2563EB; font-size: 24px; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
        .title { color: #0f172a; font-size: 20px; font-weight: bold; margin-bottom: 16px; }
        .text { color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px; }
        .button { display: inline-block; background-color: #2563EB; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; }
        .footer { margin-top: 40px; font-size: 14px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="https://sovira.com.ng" class="logo">
          Sovira
        </a>
        <h1 class="title">Verify your email address</h1>
        <p class="text">
          Hi there,<br><br>
          Welcome to Sovira SEO! To get started and access your dashboard, please confirm your email address by clicking the button below.
        </p>
        <a href="${actionLink}" class="button">Verify Email Address</a>
        <p class="text" style="margin-top: 24px; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${actionLink}" style="color: #2563EB; word-break: break-all;">${actionLink}</a>
        </p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Sovira. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `

  return resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Welcome to Sovira - Verify your email',
    html,
  })
}

export async function sendWelcomeEmail(email: string) {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Sovira</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .logo { color: #2563EB; font-size: 24px; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
        .title { color: #0f172a; font-size: 20px; font-weight: bold; margin-bottom: 16px; }
        .text { color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px; }
        .button { display: inline-block; background-color: #2563EB; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; }
        .footer { margin-top: 40px; font-size: 14px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="https://sovira.com.ng" class="logo">
          Sovira
        </a>
        <h1 class="title">You're in! Welcome to Sovira</h1>
        <p class="text">
          Hi there,<br><br>
          Your email has been successfully verified. You can now access your Sovira SEO dashboard and start optimizing your content.
        </p>
        <a href="https://sovira.com.ng/dashboard" class="button">Go to Dashboard</a>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Sovira. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `

  return resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Welcome to Sovira!',
    html,
  })
}
