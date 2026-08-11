import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface RecurringPromoEmailProps {
  name: string
  unsubscribeUrl: string
}

export const RecurringPromoEmail = ({
  name,
  unsubscribeUrl,
}: RecurringPromoEmailProps) => {
  const tips = [
    "Did you know you can track your competitors' rankings directly from your dashboard? Keep an eye on their keywords to stay ahead!",
    "Our AI Writer can generate a full 1,500-word SEO-optimized blog post in seconds. Have you tried it this week?",
    "Building your first InstantSite? Remember to use the AI Web Editor to tweak your colors and layout without touching code.",
    "Don't forget to connect your Google Search Console to get real-time indexing statuses for all your pages."
  ]
  const randomTip = tips[Math.floor(Math.random() * tips.length)]

  return (
    <Html>
      <Head />
      <Preview>Accelerate your growth with Sovira SEO</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hi {name || 'Creator'},</Heading>
          
          <Text style={text}>
            We hope you're having a great week growing your online presence!
          </Text>
          
          <Section style={tipSection}>
            <Text style={tipHeader}>💡 Quick Tip of the Day:</Text>
            <Text style={tipText}>{randomTip}</Text>
          </Section>

          <Text style={text}>
            Log back in to check your latest rankings, generate new content, and push your sites to the top of Google.
          </Text>

          <Section style={buttonContainer}>
            <Link href="https://sovira.com.ng/dashboard" style={button}>
              Go to Dashboard
            </Link>
          </Section>

          <Text style={footer}>
            To stop receiving these tips, you can <Link href={unsubscribeUrl} style={unsubscribeLink}>unsubscribe here</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecurringPromoEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  borderRadius: '12px',
}

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 20px',
}

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const tipSection = {
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #3b82f6',
  padding: '16px',
  marginBottom: '24px',
  borderRadius: '0 8px 8px 0',
}

const tipHeader = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const tipText = {
  color: '#1e3a8a',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const footer = {
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '40px 0 0',
  textAlign: 'center' as const,
}

const unsubscribeLink = {
  color: '#64748b',
  textDecoration: 'underline',
}
