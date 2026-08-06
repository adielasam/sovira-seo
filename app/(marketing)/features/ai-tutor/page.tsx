import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Tutor & Presentation Builder | Sovira AI',
  description: 'Turn dense text, client research, or complex SEO strategies into interactive mindmaps, beautiful infographics, and ready-to-present PowerPoint slides instantly.',
}

export default function AiTutorPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-purple-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/50 via-slate-50 to-slate-50 dark:from-purple-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Turn Boring Topics into <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400">Visual Study Materials & Decks</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop struggling with dense text. The Sovira AI Tutor instantly converts any topic, document, or dataset into interactive mindmaps, beautiful infographics, flashcards, and quizzes.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-purple-600 dark:prose-a:text-purple-400 hover:prose-a:text-purple-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Dense Information</h2>
            <p>
              Whether you are an agency marketer trying to digest a 50-page client briefing, or a professional trying to learn a complex new SEO concept, dense information slows you down. Synthesizing that text into something understandable—let alone designing slides or study aids—usually requires hours of tedious manual work.
            </p>

            <h3>Instant Visualizations from Any Source</h3>
            <p>
              The Sovira AI Tutor does the heavy lifting for you. Simply type in a topic or upload your existing files (we natively support TXT, MD, CSV, and JSON formats). In seconds, our AI automatically generates highly structured, visually engaging formats including interactive mindmaps and beautifully laid-out infographics. 
            </p>
            <p>
              Need to turn a raw client research doc into a presentation-ready deck? The AI Tutor instantly transforms paragraphs into visual logic, empowering marketers and agencies to move from research to presentation in minutes rather than days.
            </p>

            <h3>Interactive Learning & Onboarding</h3>
            <p>
              Beyond presentations, the tool features dedicated Quiz and Flashcard modes. This is perfect for testing your own knowledge on a new subject, or rapidly onboarding new team members. Generate interactive Q&A directly from your company's source materials to ensure everyone understands the strategy.
            </p>

            <h3>One-Click Export to PDF & PowerPoint</h3>
            <p>
              We know that your work doesn't stop in the browser. That's why the AI Tutor includes massive time-saving export capabilities. With a single click, you can take your AI-generated infographics, mindmaps, and flashcards and download them as a polished PDF or a fully formatted PowerPoint (PPTX) file.
            </p>

            <h3>Ready to Learn and Present Faster?</h3>
            <p>
              Whether you're studying a complex SEO strategy or preparing a crucial client presentation, let our AI Tutor handle the organization and visualization of your data. Head over to our <Link href="/pricing">pricing page</Link> to start your risk-free trial today.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
