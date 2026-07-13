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
