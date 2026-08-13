import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { Chatbot } from "@/components/chatbot";
import { StructuredData } from "@/components/seo/StructuredData";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sovira.com.ng'),
  title: {
    default: "Sovira AI — AI-Powered SEO & Content Tools for Creators and Businesses",
    template: "%s | Sovira AI"
  },
  description: "Sovira AI helps you rank higher, write faster, and grow your content with AI-powered SEO tools, rank tracking, and content creation — built for creators and businesses in Nigeria and beyond.",
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
          <script defer data-domain="sovira.com.ng" src="https://plausible.io/js/script.js" />
        </ThemeProvider>

        {/* OneSignal Web Push SDK */}
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "e24c9093-62c7-40b8-8a44-720a4de14f99",
                safari_web_id: "",
                notifyButton: {
                  enable: true,
                },
                allowLocalhostAsSecureOrigin: true,
              });
            });
          `}
        </Script>
        
        {/* BFCache handler to fix "This page couldn't load" errors when using browser back button */}
        <Script id="bfcache-handler" strategy="afterInteractive">
          {`
            window.addEventListener('pageshow', function(event) {
              if (event.persisted) {
                window.location.reload();
              }
            });
          `}
        </Script>
      </body>
    </html>
  );
}
