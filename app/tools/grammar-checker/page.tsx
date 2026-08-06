import { Metadata } from 'next'
import { ToolInterface } from '../components/ToolInterface'

export const metadata: Metadata = {
  title: 'Free AI Grammar Checker & Rewriter | Sovira SEO',
  description: 'Check your grammar, fix spelling mistakes, and improve sentence flow instantly for free using advanced AI.',
  keywords: 'grammar checker, spell check, ai proofreader, sentence rewriter, free grammar tool',
  openGraph: {
    title: 'Free AI Grammar Checker & Rewriter',
    description: 'Fix spelling mistakes and improve sentence flow instantly.',
  }
}

export default function GrammarCheckerPage() {
  return (
    <>
      <ToolInterface 
        title="AI Grammar Checker"
        description="Paste your draft below. Our elite AI proofreader will instantly fix all grammatical errors, spelling mistakes, and punctuation issues while improving overall clarity."
        action="grammar"
        inputPlaceholder="Paste your text here to check for grammar and spelling errors..."
        buttonText="Fix Grammar"
        isTextArea={true}
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-24 prose dark:prose-invert">
        <h2>Flawless writing made easy</h2>
        <p>Whether you are writing a professional email, an academic essay, or an SEO blog post, poor grammar can ruin your credibility and increase your bounce rate.</p>
        <p>Our completely free <strong>AI Grammar Checker</strong> goes beyond simple spell-check. It understands the context of your sentences to fix complex grammatical errors, suggest better vocabulary, and improve the overall flow of your writing without changing your personal tone.</p>
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
