import { Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr, Img, Link } from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name: string;
  unsubscribeUrl?: string;
}

export const WelcomeEmail = ({
  name = 'User',
  unsubscribeUrl = 'https://sovira.com.ng/settings?tab=notifications',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Sovira SEO - Your premium InstantSite platform</Preview>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header */}
          <Section style={header}>
            <Heading style={headerLogo}>S O V I R A</Heading>
            <Text style={headerSubtext}>INSTANTSITE & SEO PLATFORM</Text>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Heading style={h1}>Welcome to Sovira, {name}!</Heading>
            <Text style={text}>
              We're thrilled to have you on board. Sovira is your all-in-one platform for rapid InstantSite deployment, AI content generation, and advanced SEO analysis.
            </Text>
            <Text style={text}>
              As a new user, you have automatically unlocked a <strong>3-month free trial</strong> of our premium features. You can start generating high-quality content and building your online presence right away.
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href="https://www.sovira.com.ng/dashboard">
                Go to Dashboard
              </Button>
            </Section>

            <Hr style={hr} />
            
            <Text style={footer}>
              If you have any questions, simply reply to this email. We're here to help!
              <br />
              To opt out of future tips and updates, <Link href={unsubscribeUrl} style={{ color: '#64748b', textDecoration: 'underline' }}>unsubscribe here</Link>.
              <br />
              &copy; {new Date().getFullYear()} Sovira Technologies. All rights reserved.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#0a5c70', // AGATHA Teal
  padding: '40px 20px',
  textAlign: 'center' as const,
};

const headerLogo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  margin: '0',
};

const headerSubtext = {
  color: '#84c6d6',
  fontSize: '12px',
  letterSpacing: '2px',
  margin: '10px 0 0 0',
  textTransform: 'uppercase' as const,
};

const bodySection = {
  padding: '30px 40px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '0 0 20px 0',
};

const text = {
  color: '#4a4a4a',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#0a5c70',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '30px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
};
