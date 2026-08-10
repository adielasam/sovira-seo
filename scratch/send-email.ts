import { Resend } from 'resend'
import { render } from '@react-email/render'
import AdvantagesEmail from '../../emails/AdvantagesEmail'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const resend = new Resend(process.env.RESEND_API_KEY)

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
