import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  userEmail: string;
  unsubscribeUrl: string;
}

export const WelcomeEmail = ({
  userEmail,
  unsubscribeUrl,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Sovira AI! Here's a quick tour of your new toolkit.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Sovira AI 🚀</Heading>
          
          <Text style={text}>
            Hi there,
          </Text>
          <Text style={text}>
            Thanks for joining Sovira AI! You're now equipped with a powerful suite of tools designed to help creators and businesses scale efficiently.
          </Text>
          
          <Section style={section}>
            <Heading as="h2" style={h2}>Your Full Suite Tour</Heading>
            
            <Text style={featureText}>
              <strong>📊 Data Analyser:</strong> Make sense of complex data instantly and uncover actionable insights.
            </Text>
            <Text style={featureText}>
              <strong>✍️ AI Humanizer:</strong> Transform robotic text into natural, engaging content that sounds like you.
            </Text>
            <Text style={featureText}>
              <strong>🎓 AI Tutor:</strong> Learn new concepts quickly with your personalized learning assistant.
            </Text>
            <Text style={featureText}>
              <strong>🔍 AI Detector:</strong> Check if content was AI-generated before you hit publish.
            </Text>
            <Text style={featureText}>
              <strong>🎨 Image/Video Studio:</strong> Create stunning visuals for your campaigns in seconds.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href="https://soviraseo.com/dashboard">
              Go to Dashboard
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            If you need any help, just reply to this email. We're here for you.
          </Text>
          <Text style={footer}>
            To manage your email preferences or unsubscribe from marketing emails, <Link href={unsubscribeUrl} style={link}>click here</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  border: '1px solid #eaeaea',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a202c',
  fontSize: '24px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '1.4',
};

const h2 = {
  color: '#2d3748',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const featureText = {
  color: '#4a5568',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 12px',
};

const section = {
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

export default WelcomeEmail;
