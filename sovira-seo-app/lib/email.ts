import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sovira SEO <onboarding@resend.dev>',
      to: [email],
      subject: 'Welcome to Sovira SEO!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #2563eb;">Welcome to Sovira SEO, ${name}!</h1>
          <p>We are thrilled to have you on board. Sovira SEO is your all-in-one platform for keyword tracking, SEO auditing, and AI-powered content generation.</p>
          <p>Here are a few things you can do to get started:</p>
          <ul>
            <li><strong>Track your keywords:</strong> Add the keywords you want to monitor in the Rank Tracker.</li>
            <li><strong>Run an SEO Audit:</strong> Scan your website for technical SEO issues.</li>
            <li><strong>Generate Content:</strong> Use our AI tools to write optimized articles.</li>
          </ul>
          <p>If you need any help, feel free to reply to this email or reach out to our support team.</p>
          <p>Best regards,<br>The Sovira Team</p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error }
  }
}

export async function sendLoginAlertEmail(email: string, name: string, ip: string, userAgent: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sovira Security <onboarding@resend.dev>',
      to: [email],
      subject: 'New Login Detected - Sovira SEO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #dc2626;">New Login Detected</h2>
          <p>Hi ${name || 'User'},</p>
          <p>We detected a new login to your Sovira SEO account.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
            <p style="margin: 5px 0;"><strong>Device/Browser:</strong> ${userAgent}</p>
          </div>
          <p>If this was you, you can safely ignore this email.</p>
          <p>If you did not authorize this login, please <a href="https://sovira.com.ng/auth/forgot-password">reset your password immediately</a>.</p>
          <p>Stay safe,<br>Sovira Security Team</p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send login alert email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending login alert email:', error)
    return { success: false, error }
  }
}

export async function sendTrialExpiredEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sovira Support <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Sovira SEO Trial Has Expired',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background-color: #0F172A; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 4px; font-weight: 800;">SOVIRA</h1>
            <p style="color: #94A3B8; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">AI Search & Content Platform</p>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #0F172A; margin-top: 0; font-size: 22px;">Don't Miss Out, ${name || 'Creator'}!</h2>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              Your 90-day free access to Sovira SEO has ended. We hope you've experienced the power of our AI content generator, rank tracker, and technical SEO audits.
            </p>
            
            <!-- Callout Box -->
            <div style="background-color: #F0F9FF; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h3 style="color: #0369A1; margin-top: 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                ⚡ Keep the Momentum Going
              </h3>
              <p style="color: #0C4A6E; font-size: 14px; margin-bottom: 0; line-height: 1.5;">
                Upgrade to a paid plan today to instantly regain access to your dashboard, saved keywords, and AI generation tools.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="https://sovira.com.ng/pricing" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">
                View Plans & Upgrade
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Sovira SEO. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send trial expired email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending trial expired email:', error)
    return { success: false, error }
  }
}
