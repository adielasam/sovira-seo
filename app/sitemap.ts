import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.sovira.com.ng'

  // Define static routes
  const routes = [
    '',
    '/pricing',
    '/about',
    '/careers',
    '/changelog',
    '/privacy-policy',
    '/terms',
    '/seo-tools',
    '/youtube-seo-tools',
    '/content-creation-tools'
  ]

  const sitemapEntries = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly' as any,
    priority: route === '' ? 1.0 : (route.includes('tools') ? 0.9 : 0.8),
  }))

  return sitemapEntries
}
