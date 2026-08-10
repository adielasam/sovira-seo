import { Resend } from 'resend'
import { render } from '@react-email/render'
import AdvantagesEmail from '../emails/AdvantagesEmail'
import * as fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const resendKeyMatch = envFile.match(/RESEND_API_KEY=(.*)/)
const resendKey = resendKeyMatch ? resendKeyMatch[1].trim() : ''

const resend = new Resend(resendKey)

async function testEmail() {
  try {
    const html = await render(AdvantagesEmail({ name: 'Adiel' }))
    
    const data = await resend.emails.send({
      from: 'Sovira SEO <onboarding@resend.dev>',
      to: 'adielasam2015@gmail.com',
      subject: 'Unlock the Full Power of Sovira SEO',
      html: html,
    })
    
    console.log('Test email sent successfully!', data)
  } catch (err) {
    console.error('Failed to send test email:', err)
  }
}

testEmail()
