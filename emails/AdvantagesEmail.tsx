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

interface AdvantagesEmailProps {
  name?: string
}

export const AdvantagesEmail = ({
  name = 'Creator',
}: AdvantagesEmailProps) => {
  const previewText = `Unlock the full potential of Sovira SEO for your business.`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>SOVIRA</Text>
            <Text style={logoSub}>AI Search & Content Platform</Text>
          </Section>
          
          <Section style={content}>
            <Heading style={heading}>Supercharge Your Growth, {name}</Heading>
            <Text style={paragraph}>
              You have been exploring Sovira SEO, but are you truly unlocking its full potential? Our most successful users rely on three core features to scale their businesses and dominate search rankings. Here is how you can use them today:
            </Text>

            <div style={featureBox}>
              <Text style={featureHeading}>1-Click InstantSites</Text>
              <Text style={featureText}>
                <strong>Why you need it:</strong> Building websites is usually expensive and time-consuming. 
                <br /><br />
                <strong>How to use it:</strong> Simply enter your business name and a brief description. Our AI will instantly generate a fully coded, hosted, and SEO-optimized landing page designed to convert visitors into customers immediately.
              </Text>
            </div>

            <div style={featureBox}>
              <Text style={featureHeading}>Rank Tracker & Analytics</Text>
              <Text style={featureText}>
                <strong>Why you need it:</strong> You cannot improve what you do not measure.
                <br /><br />
                <strong>How to use it:</strong> Add your most valuable keywords to the dashboard. The system will monitor your position on Google daily, uncover competitor gaps, and show you exactly what to optimize to reach the first page.
              </Text>
            </div>

            <div style={featureBox}>
              <Text style={featureHeading}>AI Content & SEO Audits</Text>
              <Text style={featureText}>
                <strong>Why you need it:</strong> Search engines penalize slow sites and reward high-quality, human-like content.
                <br /><br />
                <strong>How to use it:</strong> Run a technical SEO audit to instantly identify and fix critical errors holding your site back. Then, use our AI tools to generate undetectable, high-ranking content that establishes your authority in your niche.
              </Text>
            </div>

            <Text style={paragraph}>
              Your 14-day free trial gives you full access to explore these powerful tools. Log back in and generate your next high-converting asset today.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://sovira.com.ng/dashboard" style={button}>
                Open Dashboard
              </Link>
            </Section>
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Sovira SEO. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://sovira.com.ng/settings" style={unsubscribeLink}>
                Unsubscribe from these emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f3f4f6',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  maxWidth: '600px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
}

const header = {
  backgroundColor: '#0F172A',
  padding: '40px 20px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '800',
  letterSpacing: '4px',
  margin: '0',
}

const logoSub = {
  color: '#94A3B8',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '8px 0 0',
}

const content = {
  padding: '40px 30px',
}

const heading = {
  fontSize: '24px',
  color: '#0F172A',
  margin: '0 0 20px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#475569',
  marginBottom: '24px',
}

const featureBox = {
  backgroundColor: '#F8FAFC',
  borderLeft: '4px solid #3B82F6',
  borderRadius: '4px 8px 8px 4px',
  padding: '16px 20px',
  marginBottom: '20px',
}

const featureHeading = {
  margin: '0 0 8px',
  color: '#0F172A',
  fontSize: '16px',
  fontWeight: '600',
}

const featureText = {
  margin: '0',
  color: '#475569',
  fontSize: '14px',
  lineHeight: '1.5',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
}

const button = {
  backgroundColor: '#2563EB',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
}

const footer = {
  backgroundColor: '#F8FAFC',
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #E2E8F0',
}

const footerText = {
  fontSize: '12px',
  color: '#64748B',
  margin: '0 0 8px 0',
}

const unsubscribeLink = {
  color: '#94A3B8',
  textDecoration: 'underline',
}

export default AdvantagesEmail
