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
        maxChars={700}
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 prose dark:prose-invert">
        <h2>Why use an AI Humanizer?</h2>
        <p>Search engines and educational institutions are increasingly using AI detectors like GPTZero, Turnitin, and Originality.ai to flag machine-generated content. If you are creating blogs, essays, or marketing copy using ChatGPT, you risk being penalized or flagged.</p>
        <p>Our completely free <strong>AI Text Humanizer</strong> uses an advanced stealth model to intelligently restructure sentences, inject human-like burstiness, and eliminate common robotic "AI footprints" (words like <em>delve</em>, <em>tapestry</em>, <em>crucial</em>) so your content reads naturally and passes detection.</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 text-center">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Want more?</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Create a free account to unlock the full toolkit.</p>
          <a href="/auth/register" className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Create Free Account
          </a>
        </div>
      </div>
    </>
  )
}
