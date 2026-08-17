import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sovira AI',
    short_name: 'Sovira AI',
    description: 'AI-Powered SEO & Content Tools for Creators and Businesses',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64',
        type: 'image/x-icon',
      },
      {
        src: '/sovira-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/sovira-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
