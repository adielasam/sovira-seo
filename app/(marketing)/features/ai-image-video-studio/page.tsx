import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Image & Video Studio | Sovira AI',
  description: 'Produce strikingly cinematic video at the speed of thought. Turn text prompts or static images into high-quality video for YouTube and TikTok.',
}

export default function AiImageVideoStudioPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Produce Cinematic Video at the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Speed of Thought</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop paying for expensive production agencies. Turn simple text prompts or static images into strikingly cinematic video for YouTube, TikTok, and client campaigns in minutes.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Video Production</h2>
            <p>
              Video is the highest ROI marketing asset, but traditional production is painfully slow, incredibly expensive, and inflexible. By the time a concept is shot, edited, and approved, the trend is often over. As a founder, I was spending thousands of dollars trying to keep up with the content treadmill—until I started using this exact studio engine to generate my own B-roll and promotional clips in a fraction of the time.
            </p>

            <h3>Three Distinct Generation Modes</h3>
            <p>
              The Sovira AI Studio is built for complete creative flexibility. Use <strong>Text-to-Video</strong> to generate entirely new scenes from scratch. Use <strong>Image-to-Video</strong> to bring static photos or graphics to life with cinematic camera movement. Or use <strong>Text-to-Image</strong> when you just need a high-quality static asset quickly. 
            </p>

            <h3>Built-In Narration & Lip Sync</h3>
            <p>
              Great visuals aren't enough—you need a voice. Our studio features a dedicated Character Dialogue module. You can type out what a character should say, instantly preview the synthesized voice, and generate synchronized narration. It's like having a voice actor on standby 24/7 without the studio fees.
            </p>

            <h3>Optimized for Every Platform</h3>
            <p>
              We've baked in the formats that modern marketers actually use. Seamlessly toggle your output between 16:9 Landscape (perfect for YouTube and web embeds) and 9:16 Portrait (optimized for TikTok, Reels, and Shorts). You can also adjust the scene duration up to 10 seconds to fit your exact pacing needs.
            </p>

            <h3>Ready to Become a One-Person Production Studio?</h3>
            <p>
              Don't let budget constraints stop you from executing high-end video campaigns. Start producing striking cinematic content today. <em>(Note: Due to the high compute costs of rendering AI video, generation credits are metered based on your subscription tier.)</em>
            </p>
            <p>
              Check out our <Link href="/pricing">pricing page</Link> to see the generous limits included in our Pro and Agency plans and start your risk-free trial.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
