import { Metadata } from 'next'
import { ToolInterface } from '../components/ToolInterface'

export const metadata: Metadata = {
  title: 'Free YouTube Title Generator AI | Viral Video Ideas | Sovira SEO',
  description: 'Generate highly clickable, viral, and SEO-optimized YouTube video titles in seconds using AI. Boost your CTR and views for free.',
  keywords: 'youtube title generator, viral youtube titles, video title maker ai, youtube seo tool',
  openGraph: {
    title: 'Free YouTube Title Generator AI',
    description: 'Generate highly clickable, viral YouTube titles for free.',
  }
}

export default function YouTubeTitlePage() {
  return (
    <>
      <ToolInterface 
        title="YouTube Title Generator"
        description="Struggling to get clicks? Describe your video topic below, and our AI will generate 5 highly engaging, SEO-optimized, viral YouTube titles designed to maximize your Click-Through Rate (CTR)."
        action="youtube"
        inputPlaceholder="e.g., 'A video about a cat reacting to a cucumber' or 'How to build a SaaS in 1 day'"
        buttonText="Generate Viral Titles"
        isTextArea={false}
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 prose dark:prose-invert">
        <h2>How to write a viral YouTube Title?</h2>
        <p>The difference between 1,000 views and 1,000,000 views often comes down to the title and thumbnail. A great title triggers curiosity, promises value, or creates an emotional response.</p>
        <p>Our completely free <strong>YouTube Title Generator</strong> analyzes trending psychology and YouTube search algorithms to output titles that are under 60 characters (so they don't get cut off on mobile), include power words, and naturally integrate your target keywords for maximum YouTube SEO visibility.</p>
      </div>
    </>
  )
}
