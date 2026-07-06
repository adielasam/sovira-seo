import Script from 'next/script'

export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Sovira AI",
        "applicationCategory": "SEO/Marketing Tool",
        "operatingSystem": "Web",
        "url": "https://www.sovira.com.ng",
        "offers": {
          "@type": "Offer",
          "price": "9900",
          "priceCurrency": "NGN"
        },
        "description": "Sovira AI is the ultimate SEO and content creation tool. Audit your site, generate optimized content, and track your rankings globally."
      },
      {
        "@type": "Organization",
        "name": "Sovira AI",
        "url": "https://www.sovira.com.ng",
        "logo": "https://www.sovira.com.ng/dashboard-preview.png",
        "sameAs": [
          "https://twitter.com/soviraseo",
          "https://www.linkedin.com/company/soviraseo"
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Sovira AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sovira AI is an all-in-one AI-powered SEO platform designed to help you audit your site, find keywords, generate optimized content, and track your rankings on a global scale."
            }
          },
          {
            "@type": "Question",
            "name": "Does Sovira AI work for YouTube?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! Sovira AI is specifically designed as an AI SEO tool for YouTube creators, helping you discover high-value keywords and optimize your video descriptions and titles for maximum reach."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a free plan?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we offer a risk-free trial so you can experience the power of our AI audit and keyword tools before committing to a paid plan."
            }
          },
          {
            "@type": "Question",
            "name": "What makes Sovira AI different for creators?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sovira AI combines technical SEO with advanced AI content generation, giving global creators access to enterprise-grade search volume data, rank tracking, and optimization tools in one seamless dashboard."
            }
          }
        ]
      }
    ]
  }

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
