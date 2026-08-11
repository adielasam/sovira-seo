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

interface SeoAlertEmailProps {
  name: string
  pointsDropped: number
}

export const SeoAlertEmail = ({
  name,
  pointsDropped = 12
}: SeoAlertEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{`URGENT: Your SEO Health Score has dropped by ${pointsDropped} points`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🚨 SEO Alert</Heading>
          
          <Text style={text}>Hi {name || 'Creator'},</Text>
          
          <Text style={text}>
            Our automated scanners have detected a sudden <strong>{pointsDropped}-point drop</strong> in your overall SEO Health Score in the last 24 hours.
          </Text>
          
          <Section style={alertBox}>
            <Text style={alertHeader}>Potential Issues Detected:</Text>
            <ul style={ul}>
              <li>Lost backlinks from referring domains</li>
              <li>New broken links (404 errors) found</li>
              <li>Core Web Vitals performance dip</li>
            </ul>
          </Section>

          <Text style={text}>
            We highly recommend logging in immediately to run a full diagnostic audit and fix these issues before Google re-indexes your pages.
          </Text>

          <Section style={buttonContainer}>
            <Link href="https://sovira.com.ng/dashboard" style={button}>
              Log In to Dashboard
            </Link>
          </Section>

          <Text style={footer}>
            Sent automatically by Sovira SEO Scanners. <br />
            You are receiving this because you have automated monitoring enabled.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SeoAlertEmail

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
  borderTop: '4px solid #ef4444'
}

const h1 = {
  color: '#ef4444',
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

const alertBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  padding: '20px',
  marginBottom: '24px',
  borderRadius: '8px',
}

const alertHeader = {
  color: '#991b1b',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
}

const ul = {
  color: '#991b1b',
  margin: '0',
  paddingLeft: '20px',
  fontSize: '15px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#ef4444',
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
