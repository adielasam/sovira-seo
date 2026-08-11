import { Resend } from 'resend'
import { render } from '@react-email/render'
import * as React from 'react'
import WelcomeEmail from '@/emails/WelcomeEmail'
import ReengagementEmail from '@/emails/ReengagementEmail'
import TrialEndingEmail from '@/emails/TrialEndingEmail'
import ProjectDeletionEmail from '@/emails/ProjectDeletionEmail'
import AdvantagesEmail from '@/emails/AdvantagesEmail'
import RecurringPromoEmail from '@/emails/RecurringPromoEmail'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')
const fromEmail = 'Sovira SEO <onboarding@resend.dev>'

export async function sendWelcomeEmail(email: string, name: string, userId: string) {
  try {
    const html = await render(React.createElement(WelcomeEmail, { name: name || 'User' }))
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Welcome to Sovira SEO!',
      html: html,
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

export async function sendReengagementEmail(email: string, daysInactive: number, userId: string) {
  try {
    const unsubscribeUrl = `https://sovira.com.ng/api/unsubscribe?userId=${encodeURIComponent(userId)}`
    const html = await render(React.createElement(ReengagementEmail, { daysInactive, unsubscribeUrl }))

    let subject = "We miss you! Come see what's new"
    if (daysInactive === 5) subject = "Still getting settled? We can help!"
    else if (daysInactive === 14) subject = "Don't lose your momentum!"

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: subject,
      html: html,
    })

    if (error) {
      console.error('Failed to send reengagement email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending reengagement email:', error)
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

export async function sendTrialEndingWarning(email: string, name: string) {
  try {
    const html = await render(React.createElement(TrialEndingEmail, { name }));
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Action Required: Your Sovira Free Trial is Ending Soon',
      html,
    });

    if (error) {
      console.error('Failed to send trial warning email', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending trial warning email', error);
    return { success: false, error };
  }
}

export async function sendTrialExpiredEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
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
              Your 14-day free access to Sovira SEO has ended. We hope you've experienced the power of our AI content generator, rank tracker, and technical SEO audits.
            </p>
            
            <!-- Callout Box -->
            <div style="background-color: #F0F9FF; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h3 style="color: #0369A1; margin-top: 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                ⚡ Keep the Momentum Going
              </h3>
              <p style="color: #0C4A6E; font-size: 14px; margin-bottom: 0; line-height: 1.5;">
                Upgrade to a paid plan today to instantly regain access to your generation tools.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="https://sovira.com.ng/pricing" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">
                View Plans & Upgrade
              </a>
            </div>
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

export async function sendBeforeDeletionWarning(email: string, projectName: string) {
  try {
    const html = await render(React.createElement(ProjectDeletionEmail, { projectName }));
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Important: Your project "${projectName}" is scheduled for deletion`,
      html,
    });

    if (error) {
      console.error('Failed to send deletion warning email', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending deletion warning email', error);
    return { success: false, error };
  }
}

export async function sendAdvantagesEmail(email: string, name: string) {
  try {
    const html = await render(React.createElement(AdvantagesEmail, { name }));
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Unlock the Full Power of Sovira SEO 🚀',
      html,
    });

    if (error) {
      console.error('Failed to send advantages email', error);
      return { success: false, error };
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending advantages email:', error)
    return { success: false, error }
  }
}

export async function sendRecurringPromoEmail(email: string, name: string, userId: string) {
  try {
    const unsubscribeUrl = `https://sovira.com.ng/api/unsubscribe?userId=${encodeURIComponent(userId)}`
    const html = await render(React.createElement(RecurringPromoEmail, { name, unsubscribeUrl }))
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Boost your growth this week with Sovira SEO! 🚀',
      html: html,
    })

    if (error) {
      console.error('Failed to send recurring promo email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending recurring promo email:', error)
    return { success: false, error }
  }
}
