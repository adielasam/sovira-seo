import { Metadata } from 'next'
import { ToolInterface } from '../components/ToolInterface'

export const metadata: Metadata = {
  title: 'Free AI Text Humanizer | Bypass AI Detectors | Sovira SEO',
  description: 'Convert AI-generated text from ChatGPT, Gemini, and Claude into 100% human-like content that passes Turnitin, GPTZero, and Originality detectors.',
  keywords: 'ai humanizer, bypass ai detector, chatgpt rewritter, stealth writer, humanize ai text free',
  openGraph: {
    title: 'Free AI Text Humanizer | Bypass AI Detectors',
    description: 'Convert AI-generated text into 100% human-like content for free.',
  }
}

export default function AiHumanizerPage() {
  return (
    <>
      <ToolInterface 
        title="AI Text Humanizer"
        description="Paste your AI-generated text below. Our advanced stealth model will rewrite it to add natural perplexity, burstiness, and human flow, bypassing all major AI detectors."
        action="humanize"
        inputPlaceholder="Paste AI-generated text here (ChatGPT, Claude, Gemini)..."
        buttonText="Humanize Text"
        isTextArea={true}
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 prose dark:prose-invert">
        <h2>Why use an AI Humanizer?</h2>
        <p>Search engines and educational institutions are increasingly using AI detectors like GPTZero, Turnitin, and Originality.ai to flag machine-generated content. If you are creating blogs, essays, or marketing copy using ChatGPT, you risk being penalized or flagged.</p>
        <p>Our completely free <strong>AI Text Humanizer</strong> uses an advanced fine-tuned LLaMA model to intelligently restructure sentences, inject human-like burstiness, and eliminate common robotic "AI footprints" (words like <em>delve</em>, <em>tapestry</em>, <em>crucial</em>) so your content reads naturally and passes detection.</p>
      </div>
    </>
  )
}
