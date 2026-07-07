import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { Chatbot } from "@/components/chatbot";
import { StructuredData } from "@/components/seo/StructuredData";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sovira.com.ng'),
  title: {
    default: "Sovira AI - AI SEO Tool for YouTube Creators",
    template: "%s | Sovira AI"
  },
  description: "Sovira AI is the ultimate SEO and content creation tool. Audit your site, generate optimized content, and track your rankings globally.",
  openGraph: {
    title: 'Sovira AI - AI SEO Tool for YouTube Creators',
    description: 'Sovira AI is the ultimate SEO and content creation tool. Audit your site, generate optimized content, and track your rankings globally.',
    url: 'https://www.sovira.com.ng',
    siteName: 'Sovira AI',
    images: [
      {
        url: '/dashboard-preview.png',
        width: 1200,
        height: 630,
        alt: 'Sovira AI Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sovira AI - AI SEO Tool for YouTube Creators',
    description: 'Sovira AI is the ultimate SEO and content creation tool. Audit your site, generate optimized content, and track your rankings globally.',
    images: ['/dashboard-preview.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
      { url: '/sovira-logo.png', type: 'image/png' },
    ],
    apple: '/sovira-logo.png',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" />
          <Chatbot />
          <StructuredData />
        </ThemeProvider>
      </body>
    </html>
  );
}
