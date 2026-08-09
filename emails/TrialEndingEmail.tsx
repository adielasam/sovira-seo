import { Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';

interface TrialEndingEmailProps {
  name: string;
}

export const TrialEndingEmail = ({ name = 'User' }: TrialEndingEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Action Required: Your Sovira Free Trial is Ending Soon</Preview>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header */}
          <Section style={header}>
            <Heading style={headerLogo}>S O V I R A</Heading>
            <Text style={headerSubtext}>SUBSCRIPTION UPDATE</Text>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Heading style={h1}>Your Trial is Ending Soon!</Heading>
            
            <Text style={text}>
              Hi {name},
            </Text>
            
            <Text style={text}>
              We hope you've enjoyed using Sovira! Your free trial is coming to an end in a few days. To maintain uninterrupted access to your data, generated sites, and premium SEO tools, please upgrade your plan.
            </Text>
            
            <Section style={alertBox}>
              <Text style={alertText}>
                <strong>New Basic Plan:</strong> We've recently introduced a new <strong>₦5,000/month Basic Plan</strong> specifically designed for students and beginners, which includes the Data Analyzer, Slides Generator, and 5 InstantSites per month!
              </Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Button style={button} href="https://www.sovira.com.ng/pricing">
                View Pricing Plans
              </Button>
            </Section>

            <Hr style={hr} />
            
            <Text style={footer}>
              If you have any questions about our plans, just reply to this email.
              <br />
              &copy; {new Date().getFullYear()} Sovira Technologies. All rights reserved.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default TrialEndingEmail;

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
  color: '#d97706', // Amber-600
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

const alertBox = {
  backgroundColor: '#fffbeb', // Amber-50
  borderLeft: '4px solid #d97706', // Amber-600
  padding: '16px 20px',
  margin: '24px 0',
  borderRadius: '0 4px 4px 0',
};

const alertText = {
  color: '#b45309', // Amber-700
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#d97706', // Amber button
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
