import Script from 'next/script'

export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Sovira AI",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": "https://www.sovira.com.ng",
        "offers": {
          "@type": "Offer",
          "price": "10000",
          "priceCurrency": "NGN"
        },
        "description": "Sovira is an AI Search & Content Intelligence Platform. Optimize for Generative AI, humanize text to bypass AI detectors, and track rankings globally."
      },
      {
        "@type": "Organization",
        "name": "Sovira",
        "url": "https://www.sovira.com.ng",
        "logo": "https://www.sovira.com.ng/soviraseologo.png",
        "description": "Sovira provides businesses, creators, and marketers with AI-powered tools for SEO, content creation, and search intelligence.",
        "sameAs": [
          "https://twitter.com/soviraseo",
          "https://www.linkedin.com/company/soviraseo"
        ]
      },
      {
        "@type": "WebSite",
        "name": "Sovira AI",
        "url": "https://www.sovira.com.ng",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.sovira.com.ng/seo-tools?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Sovira AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sovira is an AI-powered platform that helps businesses, creators, and agencies improve search visibility, create better content, optimize websites, humanize AI text, and grow using intelligent automation."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI Stealth Humanizer work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The Stealth Humanizer rewrites AI-generated text using advanced natural language algorithms that vary sentence burstiness and insert conversational imperfections, allowing content to bypass ZeroGPT and Turnitin."
            }
          },
          {
            "@type": "Question",
            "name": "What is AI Search Optimization (GEO)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Generative Engine Optimization (GEO) is the process of optimizing content to rank highly inside AI search engines like ChatGPT Search and Perplexity. Sovira provides tools to analyze and improve your brand's AI search visibility."
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
