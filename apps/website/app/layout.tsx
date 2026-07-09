import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sovira AI - AI SEO Tools for Creators Worldwide',
  description: 'The ultimate AI SEO platform for creators and businesses.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
