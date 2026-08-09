import { Resend } from 'resend';
import { renderAsync } from '@react-email/render';
import * as React from 'react';
import WelcomeEmail from '../emails/WelcomeEmail';
import TrialEndingEmail from '../emails/TrialEndingEmail';
import ProjectDeletionEmail from '../emails/ProjectDeletionEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'Sovira <noreply@sovira.com.ng>';

export async function sendWelcomeEmail(toEmail: string, name: string) {
  try {
    const html = await renderAsync(React.createElement(WelcomeEmail, { name }));
    
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Welcome to Sovira!',
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email', error);
    return { success: false, error };
  }
}

export async function sendTrialEndingWarning(toEmail: string, name: string) {
  try {
    const html = await renderAsync(React.createElement(TrialEndingEmail, { name }));
    
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Action Required: Your Sovira Free Trial is Ending Soon',
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send trial warning email', error);
    return { success: false, error };
  }
}

export async function sendBeforeDeletionWarning(toEmail: string, projectName: string) {
  try {
    const html = await renderAsync(React.createElement(ProjectDeletionEmail, { projectName }));
    
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Important: Your project "${projectName}" is scheduled for deletion`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send deletion warning email', error);
    return { success: false, error };
  }
}
