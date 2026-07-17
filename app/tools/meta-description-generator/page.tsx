import { Metadata } from 'next'
import { ToolInterface } from '../components/ToolInterface'

export const metadata: Metadata = {
  title: 'Free SEO Meta Description Generator AI | Sovira SEO',
  description: 'Generate high-converting, SEO-optimized meta descriptions for your blog posts and landing pages in seconds using AI.',
  keywords: 'meta description generator, seo meta tags, auto generate meta description ai, seo tool',
  openGraph: {
    title: 'Free SEO Meta Description Generator',
    description: 'Generate high-converting, SEO-optimized meta descriptions.',
  }
}

export default function MetaDescriptionPage() {
  return (
    <>
      <ToolInterface 
        title="SEO Meta Description Generator"
        description="Write compelling meta descriptions that rank higher on Google and drastically improve your organic click-through rate."
        action="meta"
        inputPlaceholder="Paste your blog post title, URL, or a short summary of the page..."
        buttonText="Generate Meta Tag"
        isTextArea={false}
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 prose dark:prose-invert">
        <h2>Why is a Meta Description Important?</h2>
        <p>A meta description is the short snippet of text that appears below your title on Google search engine result pages (SERPs). While it isn't a direct ranking factor for Google's algorithm, it is the biggest driver of <strong>Click-Through Rate (CTR)</strong>. A higher CTR tells Google your page is relevant, which indirectly boosts your rankings.</p>
        <p>Our completely free <strong>Meta Description Generator</strong> ensures your snippets are exactly 150-155 characters long, include a strong Call to Action (CTA), and naturally integrate your target keywords.</p>
      </div>
    </>
  )
}
