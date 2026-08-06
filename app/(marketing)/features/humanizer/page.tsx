import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Text Humanizer | Sovira AI',
  description: 'Transform robotic AI-generated text into natural, human-sounding content that bypasses detection and engages your audience.',
}

export default function HumanizerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Make AI Content Sound <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Undeniably Human</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Eliminate the robotic tone of ChatGPT and Claude. Our Stealth Humanizer rewrites your text to restore natural flow, bypass AI detectors, and build authentic trust with your readers.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with AI Writing</h2>
            <p>
              Generative AI is an incredible tool for drafting content, but its default output is often dry, repetitive, and overly formal. Search engines are actively demoting mass-produced AI spam, and more importantly, human readers immediately tune out when they feel they're being spoken to by a machine. Your clients and customers crave authenticity.
            </p>

            <h3>The Science of Stealth Humanization</h3>
            <p>
              The Sovira Stealth Humanizer doesn't just swap words with a thesaurus. It actively manipulates two core linguistic metrics: <strong>Perplexity</strong> (the unpredictability of word choices) and <strong>Burstiness</strong> (the variation in sentence length and structure). By injecting calculated randomness and natural conversational phrasing, it produces text that mirrors human writing patterns.
            </p>

            <h3>Seamless Detector Integration</h3>
            <p>
              The Humanizer works in perfect tandem with the Sovira AI Detector. If a piece of content scores as "Highly Robotic," a single click will send it through the Humanizer engine. You can then re-test the output instantly to verify that the robotic markers have been successfully stripped away.
            </p>

            <h3>Protect Your Brand Voice</h3>
            <p>
              Whether you're an agency delivering blog posts to a client, or a founder drafting email newsletters, you cannot afford to have your brand associated with low-effort bot text. Use the Humanizer as your final editorial pass to ensure your content retains its warmth, authority, and persuasive power.
            </p>

            <h3>Try It For Free</h3>
            <p>
              Ready to see the difference between a bot and a stealth-humanized draft? We include a generous monthly limit of free text humanizations for all users.
            </p>
            <p>
              Sign up today and start producing content that actually connects, or visit our <Link href="/pricing">pricing page</Link> for high-volume agency plans.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
