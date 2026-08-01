import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/_next/'],
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'Claude-Web', 'ClaudeBot', 'anthropic-ai', 'Anthropic-AI', 'OAI-SearchBot', 'Google-Extended', 'CCBot'],
        allow: ['/llms.txt', '/llms-full.txt', '/blog', '/about', '/'],
        disallow: ['/admin', '/api/', '/_next/'],
      }
    ],
    sitemap: 'https://www.sovira.com.ng/sitemap.xml',
  }
}
