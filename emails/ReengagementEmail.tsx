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

interface ReengagementEmailProps {
  daysInactive: number;
  unsubscribeUrl: string;
}

export const ReengagementEmail = ({
  daysInactive,
  unsubscribeUrl,
}: ReengagementEmailProps) => {
  const is5Day = daysInactive === 5;
  const is14Day = daysInactive === 14;
  
  let heading = "We miss you! Come see what's new";
  let preview = "It's been a while since you last checked in. See what you're missing!";
  let message1 = "We noticed you haven't been active on Sovira AI lately, and we want to make sure you're getting the most out of your toolkit.";
  let message2 = "Our users are seeing great results using the Rank Tracker and AI tools. Why not jump back in and run a quick analysis?";

  if (is5Day) {
    heading = "Still getting settled? We can help!";
    preview = "Need help getting started with Sovira AI?";
    message1 = "It's been a few days since you signed up! We know diving into a new platform can be overwhelming.";
    message2 = "Whether you need to generate high-ranking SEO content or audit your site, we're ready when you are.";
  } else if (is14Day) {
    heading = "Don't lose your momentum!";
    preview = "It's been 2 weeks. Keep your SEO strategy on track.";
    message1 = "Consistency is key in SEO. It's been about two weeks since your last activity.";
    message2 = "Log in today to refresh your rank tracking and see how your keywords are performing.";
  }

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          
          <Text style={text}>{message1}</Text>
          <Text style={text}>{message2}</Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href="https://soviraseo.com/dashboard">
              Return to Dashboard
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            If you need any help or have questions, just reply to this email.
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

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
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

export default ReengagementEmail;
