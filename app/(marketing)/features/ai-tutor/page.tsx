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
            <h2 className="mt-0">Built from Real-World Teaching</h2>
            <p>
              The AI Tutor wasn't built in a vacuum as a generic "study tool." It exists because our founder, Adiela Sam-Ogide, coaches students daily at Dorvas Technologies. With deep hands-on experience across data analytics, web development, and content strategy, Adiela noticed a recurring pattern: brilliant professionals and students constantly got bogged down trying to synthesize dense, unstructured information.
            </p>
            <p>
              We built the AI Tutor to solve this exact problem, taking the proven workflows from real-world coaching and automating them.
            </p>

            <h3>Who is the AI Tutor For?</h3>
            <p>We designed this feature specifically to accelerate workflows across four core disciplines:</p>
            <ul>
              <li><strong>Teachers & Schools:</strong> Turn a lesson plan or curriculum document into ready-to-use flashcards, quizzes, and mindmaps for students in minutes — built by someone who coaches students on this exact workflow daily.</li>
              <li><strong>Web Developers:</strong> Turn dense technical documentation into a quick-reference mindmap or study set when picking up a new framework or language.</li>
              <li><strong>Data Analysts:</strong> Convert a research report or dataset summary into a digestible visual breakdown or presentation-ready infographic.</li>
              <li><strong>Content Creators:</strong> Turn a script, article, or research doc into structured visual assets (infographics, slides) for audience education content.</li>
            </ul>

            <h3>Instant Visualizations from Any Source</h3>
            <p>
              Simply type in a topic or upload your existing files (we natively support TXT, MD, CSV, and JSON formats). In seconds, the AI Tutor parses the data and automatically generates highly structured, visually engaging formats including interactive <strong>mindmaps</strong> and beautifully laid-out <strong>infographics</strong>.
            </p>

            <h3>Interactive Learning: Quizzes & Flashcards</h3>
            <p>
              Beyond visual summaries, the tool features dedicated <strong>Quiz</strong> and <strong>Flashcard</strong> modes. This is perfect for testing your own knowledge on a new subject, or rapidly onboarding new team members by generating interactive Q&A directly from your company's source materials.
            </p>

            <h3>One-Click Export to PDF & PowerPoint</h3>
            <p>
              We know that your work doesn't stop in the browser. That's why the AI Tutor includes massive time-saving export capabilities. With a single click, you can take your AI-generated infographics, mindmaps, and flashcards and download them as a polished <strong>PDF</strong> or a fully formatted <strong>PowerPoint (PPTX)</strong> file.
            </p>

            <h3>Ready to Learn and Present Faster?</h3>
            <p>
              Whether you're studying complex code, teaching a class, or preparing a crucial client presentation, let our AI Tutor handle the organization and visualization of your data. Head over to our <Link href="/pricing">pricing page</Link> to start your risk-free trial today.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
