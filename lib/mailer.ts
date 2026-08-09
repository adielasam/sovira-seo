import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'Sovira <noreply@sovira.com.ng>';

export async function sendWelcomeEmail(toEmail: string, name: string) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Welcome to Sovira!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Sovira, ${name}!</h1>
          <p>We're thrilled to have you on board. Sovira is your all-in-one platform for SEO, AI content generation, and InstantSite hosting.</p>
          <p>As a new user, you have access to a 3-month free trial of our premium features. Start generating high-quality content and building your online presence today!</p>
          <a href="https://www.sovira.com.ng/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Go to Dashboard</a>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email', error);
    return { success: false, error };
  }
}

export async function sendTrialEndingWarning(toEmail: string, name: string) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Action Required: Your Sovira Free Trial is Ending Soon',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #eab308;">Your Trial is Ending Soon!</h1>
          <p>Hi ${name},</p>
          <p>We hope you've enjoyed using Sovira! Your free trial is coming to an end in a few days. To maintain access to your data, generated sites, and premium SEO tools, please upgrade your plan.</p>
          <p>We've recently introduced a new <strong>₦5,000/month Basic Plan</strong> specifically designed for students and beginners, which includes the Data Analyzer, Slides Generator, and 5 InstantSites per month!</p>
          <a href="https://www.sovira.com.ng/pricing" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Pricing Plans</a>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send trial warning email', error);
    return { success: false, error };
  }
}

export async function sendBeforeDeletionWarning(toEmail: string, projectName: string) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Important: Your project "${projectName}" is scheduled for deletion`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Project Deletion Warning</h1>
          <p>Hi there,</p>
          <p>We noticed that your InstantSite project <strong>${projectName}</strong> has been inactive for over 7 days.</p>
          <p>As a free user, inactive projects are routinely cleaned up to maintain server capacity. Your project is scheduled for deletion.</p>
          <p>If you wish to keep this project online and secure your data permanently, please consider upgrading to one of our paid plans starting at just ₦5,000/month.</p>
          <a href="https://www.sovira.com.ng/pricing" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Upgrade Plan to Save Project</a>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send deletion warning email', error);
    return { success: false, error };
  }
}
