import { Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';

interface ProjectDeletionEmailProps {
  projectName: string;
}

export const ProjectDeletionEmail = ({ projectName = 'My Site' }: ProjectDeletionEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Important: Your project "{projectName}" is scheduled for deletion due to inactivity</Preview>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header */}
          <Section style={header}>
            <Heading style={headerLogo}>S O V I R A</Heading>
            <Text style={headerSubtext}>ACCOUNT NOTIFICATION</Text>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Heading style={h1}>Project Deletion Warning</Heading>
            
            <Text style={text}>
              Hi there,
            </Text>
            
            <Text style={text}>
              We noticed that your InstantSite project <strong style={{ color: '#0a5c70' }}>{projectName}</strong> has been inactive for over 7 days.
            </Text>
            
            <Text style={text}>
              As a free user, inactive projects are routinely cleaned up to maintain server capacity and ensure optimal performance for active users. Because of this, your project is currently <strong>scheduled for deletion</strong>.
            </Text>
            
            <Section style={alertBox}>
              <Text style={alertText}>
                <strong>Action Required:</strong> If you wish to keep this project online and secure your data permanently, please consider upgrading to one of our paid plans starting at just ₦5,000/month.
              </Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Button style={button} href="https://www.sovira.com.ng/pricing">
                Upgrade Plan to Save Project
              </Button>
            </Section>

            <Hr style={hr} />
            
            <Text style={footer}>
              If this was a mistake or you have questions, please reach out to support.
              <br />
              &copy; {new Date().getFullYear()} Sovira Technologies. All rights reserved.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default ProjectDeletionEmail;

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
  color: '#e11d48', // Rose-600 for warning
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
  backgroundColor: '#fff1f2', // Rose-50
  borderLeft: '4px solid #e11d48', // Rose-600
  padding: '16px 20px',
  margin: '24px 0',
  borderRadius: '0 4px 4px 0',
};

const alertText = {
  color: '#be123c', // Rose-700
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#e11d48', // Red/Rose button for urgent action
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
