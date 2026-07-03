'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'
import { HeroVisual } from '@/components/marketing/HeroVisual'
import { SocialProofBar } from '@/components/marketing/SocialProofBar'
import { DashboardDemo } from '@/components/marketing/DashboardDemo'
import { 
  Search, BarChart, Users, Sparkles, TrendingUp, Link as LinkIcon, 
  CheckCircle2, Menu, X, Check, XCircle, Star, ChevronDown, Quote 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getUserProfile, updateUserPlan } from '@/app/(dashboard)/settings/actions'

// --- Custom Hooks & Helpers ---
function useIntersectionObserver(ref: React.RefObject<Element | null>, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsIntersecting(true)
    }, { threshold: 0.1, ...options })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, options])
  return isIntersecting
}

function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionObserver(ref)
  
  useEffect(() => {
    if (!isVisible) return
    let startTimestamp: number | null = null
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(ease * end))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }
    window.requestAnimationFrame(step)
  }, [isVisible, end, duration])

  return <div ref={ref} className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">{count}{suffix}</div>
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionObserver(ref)
  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// --- Data ---
const features = [
  { name: 'AI SEO Audit', description: 'Full site crawl with actionable fixes powered by AI to identify critical SEO issues instantly.', icon: Search },
  { name: 'Keyword Research', description: 'Discover high-value keywords instantly with accurate search volumes and difficulty scores.', icon: BarChart },
  { name: 'Competitor Analysis', description: 'Track competitor rankings, discover their top keywords, and uncover their backlink strategies.', icon: Users },
  { name: 'Content Generator', description: 'Generate perfectly optimized SEO articles, meta tags, and headings with a single click.', icon: Sparkles },
  { name: 'Rank Tracker', description: 'Monitor your daily ranking progress on Google and track position changes over time.', icon: TrendingUp },
  { name: 'Backlink Monitor', description: 'Keep a close eye on your link profile, track lost links, and identify toxic domains.', icon: LinkIcon },
]

const steps = [
  { 
    id: '01', title: 'Site Audit', desc: 'Scan your site for technical SEO issues instantly.', 
    svg: <svg className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="m13.3 16.3 2.2 2.2"/></svg>,
    color: 'from-slate-700 to-slate-900 shadow-slate-900/50' 
  },
  { 
    id: '02', title: 'Keyword Research', desc: 'Discover high-value, low-competition keywords with AI.', 
    svg: <svg className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    color: 'from-blue-800 to-blue-950 shadow-blue-900/50' 
  },
  { 
    id: '03', title: 'Content Generator', desc: 'Generate perfectly optimized SEO content in seconds.', 
    svg: <svg className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>,
    color: 'from-blue-600 to-blue-800 shadow-blue-700/50' 
  },
  { 
    id: '04', title: 'Rank Tracking', desc: 'Monitor your rankings and watch your organic traffic grow.', 
    svg: <svg className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
    color: 'from-blue-400 to-blue-600 shadow-blue-500/50' 
  }
]

const comparisonData = [
  { feature: 'AI Content Generation', sovira: true, others: false },
  { feature: 'Real-time Rank Tracking', sovira: true, others: 'Partial' },
  { feature: 'Built for Global Markets', sovira: true, others: false },
  { feature: 'Local Payment Support (Paystack)', sovira: true, others: false },
  { feature: 'Affordable Pricing', sovira: true, others: false },
]

const testimonials = [
  { name: 'Sarah Jenkins', role: 'Growth Lead', company: 'NexusTech', quote: "Sovira completely replaced three expensive tools for us. The UI is incredibly fast, and the AI audits are spot on.", img: 'https://i.pravatar.cc/150?u=1' },
  { name: 'David Okafor', role: 'Agency Owner', company: 'Digital Africa', quote: "Finally, an SEO tool that understands local markets and supports local payments. Our agency productivity doubled.", img: 'https://i.pravatar.cc/150?u=2' },
  { name: 'Emily Chen', role: 'Content Manager', company: 'ScaleUp', quote: "The AI content generator actually writes like a human SEO expert. I'm saving 15 hours a week on drafting alone.", img: 'https://i.pravatar.cc/150?u=3' },
  { name: 'Michael Ross', role: 'E-commerce Founder', company: 'StoreFront', quote: "Tracking 200+ keywords used to cost me $100/mo. Sovira does it better, faster, and for a fraction of the price.", img: 'https://i.pravatar.cc/150?u=4' },
  { name: 'Aisha Bello', role: 'Marketing Director', company: 'Finserve', quote: "The competitor analysis feature uncovered exactly why we were losing to our main rival. Fixed the gaps in two days.", img: 'https://i.pravatar.cc/150?u=5' },
  { name: 'Tom Hardy', role: 'Freelance SEO', company: 'Self-Employed', quote: "I can onboard my clients, run an audit, and export a white-labeled report in 3 minutes. Absolutely game-changing.", img: 'https://i.pravatar.cc/150?u=6' },
]

const faqs = [
  { q: "What is Sovira SEO?", a: "Sovira SEO is an all-in-one AI-powered SEO platform designed to help you audit your site, find keywords, generate optimized content, and track your rankings." },
  { q: "Do I need technical skills to use it?", a: "Not at all. We built Sovira to be incredibly intuitive. If you can use social media, you can use Sovira to rank your website." },
  { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time directly from your billing dashboard with zero hassle." },
  { q: "Do you support local payments?", a: "Yes! We integrate with Paystack, allowing you to pay easily in local currencies alongside standard card payments." },
  { q: "Is there a free trial?", a: "Yes, we offer a risk-free trial so you can experience the power of the AI audit and keyword tools before committing." },
  { q: "How accurate is the AI content?", a: "Highly accurate. Our AI is fine-tuned specifically on top-ranking SEO articles to ensure the content is structurally sound, keyword-rich, and reads naturally." }
]

const marqueeTags = [
  "Keyword Research", "AI Content", "Rank Tracking", "Backlink Monitor", 
  "Competitor Analysis", "SEO Audits", "Local SEO", "Technical SEO",
  "Search Volume", "Keyword Difficulty", "White-label Reports"
]

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserProfile()
        if (data && data.user) setUser(data.user)
      } catch(e) {}
    }
    fetchUser()
  }, [])

  const handleSubscribe = async (planName: string) => {
    if (!user) {
      toast.error('Please log in or create an account first.', { icon: '🔒' })
      router.push('/auth/login?redirect=/')
      return
    }

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      toast.error('Paystack key not configured')
      return
    }
    
    let ngnAmount = 0
    const lowerPlan = planName.toLowerCase()
    if (lowerPlan === 'starter') ngnAmount = isAnnual ? 290000 : 29000
    else if (lowerPlan === 'pro') ngnAmount = isAnnual ? 790000 : 79000
    else if (lowerPlan === 'agency') ngnAmount = isAnnual ? 1990000 : 199000

    try {
      const PaystackPop = (await import('@paystack/inline-js')).default
      const paystack = new PaystackPop()
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: ngnAmount * 100, // in kobo
        currency: 'NGN',
        reference: 'SOVIRA_' + Date.now(),
        onSuccess: async (transaction: any) => {
          toast.loading('Verifying payment...')
          const res = await updateUserPlan(transaction.reference, lowerPlan)
          toast.dismiss()
          if (res.error) {
            toast.error(res.error)
          } else {
            toast.success('Payment successful! Plan upgraded.')
            router.push('/dashboard')
          }
        },
        onCancel: () => {
          console.log('Payment closed')
        }
      })
    } catch (err) {
      console.error('Paystack error:', err)
      toast.error('Failed to initialize payment gateway')
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
      
      {/* Styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }

        /* Warm hero — subtle radial accent only, cream base */
        .hero-bg {
          background-color: #FDFBF7;
        }
        .dark .hero-bg {
          background-color: #0F172A;
        }
        .hero-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 60% 50% at 80% 20%, hsla(215,90%,60%,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 20% 80%, hsla(35,90%,70%,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .dark .hero-bg::before {
          background-image:
            radial-gradient(ellipse 60% 50% at 80% 20%, hsla(215,90%,60%,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 20% 80%, hsla(250,80%,60%,0.10) 0%, transparent 70%);
        }
      `}} />

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <nav className="flex items-center justify-between h-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="bg-[#2563EB] rounded-lg p-1.5 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </span>
              <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white">Sovira SEO</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-6 ml-auto shrink-0">
            <div className="hidden md:flex gap-6 items-center">
              <Link href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Features</Link>
              <Link href="#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">How it Works</Link>
              <Link href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">Pricing</Link>
            </div>
            
            <ThemeToggle />
            
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="hidden sm:block text-sm font-semibold text-[#0F172A] dark:text-white hover:text-blue-600 transition-colors">
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 hover:shadow-lg transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
            <button 
              className="md:hidden p-2 text-[#0F172A] dark:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-lg py-4 px-4 flex flex-col gap-4">
             <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Features</Link>
             <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">How it Works</Link>
             <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Pricing</Link>
             <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Log in</Link>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero Section ─────────────────────────────────────────────── */}
        <div className="hero-bg relative pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 relative z-10">

            {/* Two-column layout: text left, visual right */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* ── Left: Headline + CTA ── */}
              <div className="flex-1 text-center lg:text-left">
                <FadeInSection>
                  {/* Eyebrow */}
                  <div className="inline-flex items-center gap-2 bg-[#2563EB]/8 dark:bg-[#2563EB]/15 border border-[#2563EB]/20 rounded-full px-4 py-1.5 mb-6">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                    <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest">Built for African Creators</span>
                  </div>

                  {/* Main headline — larger, editorial weight */}
                  <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                    The only AI SEO tool with built-in{' '}
                    <span className="text-[#2563EB]">ideation, tracking, and publishing.</span>
                  </h1>

                  <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    Connect with a purpose-driven platform ready to execute your SEO tasks at scale. Accelerate your organic growth with human-like AI content, localized tracking, and deep technical audits.
                  </p>

                  <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/auth/register" className="rounded-full bg-[#2563EB] px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-blue-500 hover:-translate-y-0.5 transition-all duration-200">
                      Start Free Trial
                    </Link>
                    <Link href="#how-it-works" className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB]/50 transition-all duration-200">
                      See How It Works
                    </Link>
                  </div>

                  {/* ── Trust Bar + Social Proof ── */}
                  <div className="mt-10 flex flex-col items-center lg:items-start gap-2">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em]">
                      Built for creators across&nbsp;&nbsp;Nigeria · Ghana · Kenya · South Africa
                    </p>
                  </div>

                  {/* ── Social proof: stacked avatars + testimonial card ── */}
                  <SocialProofBar />
                </FadeInSection>
              </div>

              {/* ── Right: Lifestyle + Stat Cards Visual (Task 3) ── */}
              <FadeInSection delay={300} className="flex-1 w-full">
                <HeroVisual creatorImageSrc="/images/hero-creator.jpg" />
              </FadeInSection>
            </div>
          </div>
        </div>

        {/* ── Animated Dashboard Demo Section ────────────────────────── */}
        <div className="bg-slate-50 dark:bg-[#0F172A] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <FadeInSection>
                <div className="text-left max-w-lg">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center font-bold text-xl mb-6 shadow-sm">1</div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                    Research keywords. Rank faster.
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    Discover high-value, low-competition keywords in seconds. Sovira AI analyzes search intent, volume, and difficulty to give you the best opportunities.
                  </p>
                  
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-500" /></div>
                      Real-time search volume and difficulty
                    </li>
                    <li className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-500" /></div>
                      AI-powered intent analysis
                    </li>
                    <li className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-500" /></div>
                      Track competitors effortlessly
                    </li>
                  </ul>
                </div>
              </FadeInSection>
              <FadeInSection delay={200} className="flex justify-center lg:justify-end">
                <DashboardDemo />
              </FadeInSection>
            </div>
          </div>
        </div>

        {/* Scrolling Stats Section */}
        <div className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] py-12 relative z-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-12 text-center lg:grid-cols-4">
              <FadeInSection delay={0} className="mx-auto flex max-w-xs flex-col gap-y-2">
                <dt className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Keywords Tracked</dt>
                <dd><AnimatedCounter end={450} suffix="+" duration={2000} /></dd>
              </FadeInSection>
              <FadeInSection delay={100} className="mx-auto flex max-w-xs flex-col gap-y-2">
                <dt className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Audits Completed</dt>
                <dd><AnimatedCounter end={120} suffix="+" duration={2500} /></dd>
              </FadeInSection>
              <FadeInSection delay={200} className="mx-auto flex max-w-xs flex-col gap-y-2">
                <dt className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Active Marketers</dt>
                <dd><AnimatedCounter end={45} suffix="+" duration={1500} /></dd>
              </FadeInSection>
              <FadeInSection delay={300} className="mx-auto flex max-w-xs flex-col gap-y-2">
                <dt className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">Satisfaction Rate</dt>
                <dd><AnimatedCounter end={98} suffix="%" duration={3000} /></dd>
              </FadeInSection>
            </dl>
          </div>
        </div>

        {/* How It Works (4-Steps) */}
        <div id="how-it-works" className="py-24 bg-slate-50 dark:bg-[#1E293B] overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <FadeInSection>
              <div className="mx-auto max-w-2xl text-center mb-16">
                <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">Workflow</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">How Sovira Works</p>
              </div>
            </FadeInSection>
            
            <div className="relative max-w-5xl mx-auto">
              {/* Desktop Connector Line */}
              <div className="hidden md:block absolute top-12 left-12 right-12 h-0.5 border-t-2 border-dashed border-slate-300 dark:border-slate-700 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
                {steps.map((step, idx) => (
                  <FadeInSection key={step.id} delay={idx * 150} className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group transition-all duration-300 md:hover:-translate-y-2">
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br ${step.color} shadow-lg ring-1 ring-inset ring-white/20 flex items-center justify-center text-white mb-6 transition-all duration-300 md:group-hover:shadow-2xl`}>
                      {step.svg}
                    </div>
                    <div className="flex items-center gap-4 mb-4 w-full justify-center md:justify-start">
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{step.id}</span>
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 max-w-[50px] md:max-w-none"></div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[250px] md:max-w-none">{step.desc}</p>
                  </FadeInSection>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Marquee */}
        <div className="py-10 bg-[#2563EB] overflow-hidden border-y border-blue-700">
          <div className="relative w-full flex">
            <div className="animate-marquee whitespace-nowrap flex items-center">
              {[...marqueeTags, ...marqueeTags, ...marqueeTags].map((tag, i) => (
                <span key={i} className="mx-4 text-xl md:text-2xl font-bold text-white/90 uppercase tracking-wider flex items-center gap-4">
                  {tag} <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Why Sovira / Comparison Table */}
        <div className="py-24 bg-white dark:bg-[#0F172A]">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center mb-16">
                <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">The Clear Choice</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Why switch to Sovira SEO?</p>
              </div>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="bg-slate-50 dark:bg-[#1E293B] rounded-3xl shadow-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="p-6 text-lg font-semibold text-slate-900 dark:text-white w-1/2">Feature</th>
                      <th className="p-6 text-lg font-bold text-blue-600 dark:text-blue-400 w-1/4 bg-blue-50/50 dark:bg-blue-900/10 text-center">Sovira SEO</th>
                      <th className="p-6 text-lg font-semibold text-slate-500 dark:text-slate-400 w-1/4 text-center">Other Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-6 font-medium text-slate-700 dark:text-slate-300">{row.feature}</td>
                        <td className="p-6 bg-blue-50/30 dark:bg-blue-900/5 text-center">
                          {row.sovira ? <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" /> : <XCircle className="w-6 h-6 text-red-500 mx-auto" />}
                        </td>
                        <td className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          {row.others === true ? <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" /> : 
                           row.others === false ? <XCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" /> : 
                           row.others}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FadeInSection>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="py-24 bg-slate-50 dark:bg-[#1E293B]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center mb-16">
                <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">Wall of Love</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Here's what people are saying</p>
              </div>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => {
                // Generate initials for avatar fallback
                const initials = t.name.split(' ').map((n: string) => n[0]).join('')
                const avatarColors = [
                  'bg-blue-600','bg-indigo-600','bg-violet-600',
                  'bg-teal-600','bg-rose-600','bg-amber-600'
                ]
                return (
                  <FadeInSection key={idx} delay={idx * 100}>
                    <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200 dark:ring-slate-800 h-full flex flex-col">
                      <Quote className="w-10 h-10 text-blue-100 dark:text-blue-900/50 mb-6" />
                      <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-8 flex-grow">&ldquo;{t.quote}&rdquo;</p>
                      <div className="flex items-center gap-4 mt-auto">
                        {/* Avatar: ring-2 in Sovira blue, initials fallback (Task 5) */}
                        <div className={`w-14 h-14 rounded-full ring-2 ring-[#2563EB] ring-offset-2 ring-offset-white dark:ring-offset-[#0F172A] flex-shrink-0 flex items-center justify-center text-white font-bold text-base ${avatarColors[idx % avatarColors.length]}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{t.role}, {t.company}</div>
                        </div>
                      </div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pricing CTA Banner */}
        <div className="py-24 bg-white dark:bg-[#0F172A]">
          <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
            <FadeInSection>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Ready to scale your organic traffic?
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Join over 520+ African creators and businesses growing their audience with Sovira SEO.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Link href="/pricing" className="rounded-full bg-[#2563EB] px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-blue-500 hover:-translate-y-0.5 transition-all duration-200">
                  See Pricing & Plans
                </Link>
              </div>
            </FadeInSection>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-24 bg-slate-50 dark:bg-[#1E293B]">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Got questions? We've got answers.</h2>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Everything you need to know about Sovira SEO and billing.</p>
              </div>
            </FadeInSection>
            
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <FadeInSection key={idx} delay={idx * 50}>
                  <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
                    <button 
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full px-6 py-5 flex items-center justify-between focus:outline-none"
                    >
                      <span className="font-semibold text-left text-slate-900 dark:text-white">{faq.q}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openFaq === idx ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {openFaq === idx ? <div className="w-3 h-0.5 bg-current" /> : <div className="w-3 h-3 relative"><div className="absolute inset-y-0 left-1.5 w-0.5 bg-current"/><div className="absolute inset-x-0 top-1.5 h-0.5 bg-current"/></div>}
                      </div>
                    </button>
                    <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="bg-blue-600 rounded-lg p-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </span>
              <span className="text-2xl font-bold tracking-tight">Sovira SEO</span>
            </Link>
            <p className="text-base text-slate-400 max-w-md leading-relaxed">
              The premium ecosystem for professional marketers. High-converting audits, semantic SEO research, and localized rank tracking.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Product</h3>
            <ul className="space-y-4 text-base text-slate-400">
              <li><Link href="/#features" className="hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link href="/integrations" className="hover:text-blue-400 transition-colors">Integrations</Link></li>
              <li><Link href="/changelog" className="hover:text-blue-400 transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Company</h3>
            <ul className="space-y-4 text-base text-slate-400">
              <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-blue-400 transition-colors">Careers</Link></li>
              <li><a href="https://wa.me/2348162337303" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Contact</a></li>
              <li><Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800 text-slate-500 flex flex-col md:flex-row justify-between items-center gap-6">
          <p>© {new Date().getFullYear()} Sovira SEO (Dorvas Technologies). All rights reserved.</p>
          <div className="flex space-x-6">
            <a href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/dorvastechnologies/"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#1877F2] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="Facebook">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/in/samogide/"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#0A66C2] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="LinkedIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
            <a href={process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com/@samgoldtales"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#FF0000] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="YouTube">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.498-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
