'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'
import { Search, BarChart, Users, Sparkles, TrendingUp, Link as LinkIcon, CheckCircle2, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'

const features = [
  {
    name: 'AI SEO Audit',
    description: 'Full site crawl with actionable fixes powered by AI to identify critical SEO issues instantly.',
    icon: Search,
  },
  {
    name: 'Keyword Research',
    description: 'Discover high-value keywords instantly with accurate search volumes and difficulty scores.',
    icon: BarChart,
  },
  {
    name: 'Competitor Analysis',
    description: 'Track competitor rankings, discover their top keywords, and uncover their backlink strategies.',
    icon: Users,
  },
  {
    name: 'Content Generator',
    description: 'Generate perfectly optimized SEO articles, meta tags, and headings with a single click.',
    icon: Sparkles,
  },
  {
    name: 'Rank Tracker',
    description: 'Monitor your daily ranking progress on Google and track position changes over time.',
    icon: TrendingUp,
  },
  {
    name: 'Backlink Monitor',
    description: 'Keep a close eye on your link profile, track lost links, and identify toxic domains.',
    icon: LinkIcon,
  },
]

const testimonials = [
  {
    name: 'Marcus Chen',
    role: 'Founder',
    company: 'TechStart',
    quote: 'We saw a 40% increase in organic traffic within two months of using the audit tool. It finds things Ahrefs completely missed.',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Agency Owner',
    company: 'Digital Edge',
    quote: 'The white-label reporting is gorgeous. My clients think we spend hours building these reports, but it takes us exactly 3 seconds.',
  },
]

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSubscribe = () => {
    toast.success('Redirecting to secure payment portal...', { icon: '💳' })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50 bg-white md:bg-transparent border-b md:border-none border-slate-200">
        <nav className="flex items-center justify-between h-14 md:h-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto w-full" aria-label="Global">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="bg-[#2563EB] rounded-lg p-1.5 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </span>
              <span className="text-lg md:text-xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">Sovira SEO</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6 ml-auto shrink-0">
            <div className="[&>button]:w-8 [&>button]:h-8 [&>button]:md:w-10 [&>button]:md:h-10 text-[#0F172A] md:dark:text-white">
               <ThemeToggle />
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
              <Link href="/auth/login" className="hidden min-[400px]:block text-sm font-semibold leading-6 text-[#0F172A] md:dark:text-white hover:text-blue-600 transition-colors whitespace-nowrap">
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-[#2563EB] px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all duration-200 whitespace-nowrap min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Get Started
              </Link>
            </div>
            <button 
              type="button" 
              className="md:hidden p-2 text-[#0F172A] min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 w-full bg-white border-b border-slate-200 shadow-lg py-4 px-4 flex flex-col gap-4">
             <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-[#0F172A]">Features</Link>
             <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-[#0F172A]">Pricing</Link>
             <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-[#0F172A]">Sign in</Link>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate pt-14 flex flex-col justify-center min-h-[90vh] bg-white md:bg-transparent">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-20 mix-blend-soft-light pointer-events-none -z-10"></div>
          
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 py-20 sm:py-32 flex flex-col items-center text-center">
            <div className="max-w-3xl w-full">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 md:dark:text-white">
                <span className="text-[#0F172A] md:text-inherit">Rank Higher.</span> <span className="text-[#2563EB]">Grow Faster.</span>
              </h1>
              <p className="mt-4 md:mt-6 text-base md:text-lg leading-relaxed text-[#475569] md:dark:text-slate-400 max-w-sm md:max-w-2xl mx-auto px-4 md:px-0">
                The AI-powered SEO platform built for serious marketers. Audit, research, track and dominate search results — all in one place.
              </p>
              <div className="mt-8 md:mt-10 flex flex-row items-center justify-center gap-3 w-full max-w-sm md:max-w-none mx-auto">
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-[#2563EB] hover:bg-blue-500 px-4 py-2.5 text-sm md:text-base font-semibold text-white shadow-sm transition-all duration-200 flex-1 max-w-[160px] md:max-w-none min-h-[44px] flex items-center justify-center whitespace-nowrap"
                >
                  Start Free Trial
                </Link>
                <a href="#demo" className="text-sm md:text-base font-semibold text-[#0F172A] md:dark:text-white px-4 py-2.5 border border-slate-300 md:border-2 md:border-slate-200 md:dark:border-slate-700 bg-white md:bg-transparent rounded-lg hover:border-[#2563EB] transition-all duration-200 flex-1 max-w-[160px] md:max-w-none min-h-[44px] flex items-center justify-center whitespace-nowrap">
                  Watch Demo <span aria-hidden="true" className="ml-1">→</span>
                </a>
              </div>
            </div>
            
            {/* Hero Image / Mockup */}
            <div className="mt-16 flow-root sm:mt-24 max-w-5xl mx-auto w-full">
              <div className="rounded-2xl bg-slate-900/5 dark:bg-white/5 p-2 ring-1 ring-inset ring-slate-900/10 dark:ring-white/10 lg:-m-4 lg:rounded-3xl lg:p-4">
                <div className="rounded-xl bg-white dark:bg-[#1E293B] shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 w-full relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-12 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 z-10 hidden sm:flex">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="relative w-full sm:pt-12">
                    <Image 
                      src="/dashboard-preview.png" 
                      alt="Sovira SEO Dashboard Interface" 
                      width={1200} 
                      height={800} 
                      className="w-full h-auto object-cover object-top rounded-b-xl sm:rounded-b-none"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 md:py-24 lg:py-32 bg-white dark:bg-[#1E293B] transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 w-full">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm md:text-base font-semibold leading-7 text-[#2563EB] md:dark:text-blue-400">Deploy faster</h2>
              <p className="mt-2 text-2xl md:text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">
                Everything you need to dominate SEO
              </p>
            </div>
            <div className="mx-auto mt-10 md:mt-16 max-w-2xl lg:max-w-none w-full">
              <dl className="grid grid-cols-1 gap-4 md:gap-x-8 md:gap-y-16 md:grid-cols-2 lg:grid-cols-3 w-full">
                {features.map((feature) => (
                  <div key={feature.name} className="flex flex-col rounded-2xl bg-[#F8FAFC] md:dark:bg-[#0F172A] p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-200 ring-1 ring-slate-200 dark:ring-slate-800 w-full">
                    <dt className="flex items-center gap-x-3 text-sm md:text-base font-semibold leading-7 text-[#0F172A] md:dark:text-white">
                      <feature.icon className="h-6 w-6 flex-none text-[#2563EB] md:dark:text-blue-400" aria-hidden="true" />
                      {feature.name}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-sm md:text-base leading-7 text-[#475569] md:dark:text-slate-400">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="py-16 md:py-24 lg:py-32 bg-[#F8FAFC] md:dark:bg-[#0F172A] transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 w-full">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-sm md:text-base font-semibold leading-7 text-[#2563EB] md:dark:text-blue-400">Pricing</h2>
              <p className="mt-2 text-2xl md:text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">
                Pricing plans for teams of all sizes
              </p>
            </div>
            
            <div className="mt-10 md:mt-16 flex justify-center">
              <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] p-1 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${!isAnnual ? 'bg-[#2563EB] text-white' : 'text-[#475569] md:dark:text-slate-400 hover:text-slate-900 md:dark:hover:text-white'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px] ${isAnnual ? 'bg-[#2563EB] text-white' : 'text-[#475569] md:dark:text-slate-400 hover:text-slate-900 md:dark:hover:text-white'}`}
                >
                  Annually <span className="bg-[#DBEAFE] text-[#1D4ED8] text-xs px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">Save 20%</span>
                </button>
              </div>
            </div>

            <div className="isolate mx-auto mt-8 md:mt-10 grid max-w-md grid-cols-1 gap-6 md:gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3 w-full">
              {/* Starter Plan */}
              <div className="rounded-3xl p-6 md:p-8 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-lg transition-all duration-300 w-full">
                <h3 className="text-lg font-semibold leading-8 text-[#0F172A] md:dark:text-white">Starter</h3>
                <p className="mt-4 text-sm leading-6 text-[#475569] md:dark:text-slate-400">Perfect for solo founders and small blogs.</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">${isAnnual ? '23' : '29'}</span>
                  <span className="text-sm font-semibold leading-6 text-[#475569] md:dark:text-slate-400">/month</span>
                </p>
                <button
                  onClick={handleSubscribe}
                  className="mt-6 block w-full rounded-lg bg-[#EFF6FF] md:dark:bg-blue-900/30 px-3 py-3 text-center text-sm font-semibold leading-6 text-[#2563EB] md:dark:text-blue-400 hover:bg-[#DBEAFE] md:dark:hover:bg-blue-900/50 ring-1 ring-inset ring-blue-200 dark:ring-blue-800 transition-colors min-h-[44px]"
                >
                  Get Started
                </button>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[#475569] md:dark:text-slate-400">
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 5 Projects</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 100 Keywords</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 500 AI Credits</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Email Support</li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="rounded-3xl p-6 md:p-8 ring-2 ring-[#2563EB] md:dark:ring-blue-500 bg-white dark:bg-[#1E293B] shadow-xl relative md:scale-105 z-10 transition-all duration-300 w-full">
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</span>
                </div>
                <h3 className="text-lg font-semibold leading-8 text-[#2563EB] md:dark:text-blue-400">Pro</h3>
                <p className="mt-4 text-sm leading-6 text-[#475569] md:dark:text-slate-400">For scaling agencies and professional marketers.</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">${isAnnual ? '63' : '79'}</span>
                  <span className="text-sm font-semibold leading-6 text-[#475569] md:dark:text-slate-400">/month</span>
                </p>
                <button
                  onClick={handleSubscribe}
                  className="mt-6 block w-full rounded-lg bg-[#2563EB] px-3 py-3 text-center text-sm font-semibold leading-6 text-white hover:bg-blue-500 shadow-sm transition-colors min-h-[44px]"
                >
                  Get Started
                </button>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[#475569] md:dark:text-slate-400">
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 25 Projects</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 500 Keywords</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> 2000 AI Credits</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Priority Support</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> API Access</li>
                </ul>
              </div>

              {/* Agency Plan */}
              <div className="rounded-3xl p-6 md:p-8 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-lg transition-all duration-300 w-full">
                <h3 className="text-lg font-semibold leading-8 text-[#0F172A] md:dark:text-white">Agency</h3>
                <p className="mt-4 text-sm leading-6 text-[#475569] md:dark:text-slate-400">Enterprise grade tools for large teams.</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white">${isAnnual ? '159' : '199'}</span>
                  <span className="text-sm font-semibold leading-6 text-[#475569] md:dark:text-slate-400">/month</span>
                </p>
                <button
                  onClick={handleSubscribe}
                  className="mt-6 block w-full rounded-lg bg-[#EFF6FF] md:dark:bg-blue-900/30 px-3 py-3 text-center text-sm font-semibold leading-6 text-[#2563EB] md:dark:text-blue-400 hover:bg-[#DBEAFE] md:dark:hover:bg-blue-900/50 ring-1 ring-inset ring-blue-200 dark:ring-blue-800 transition-colors min-h-[44px]"
                >
                  Get Started
                </button>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[#475569] md:dark:text-slate-400">
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Unlimited Projects</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Unlimited Keywords</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Unlimited AI Credits</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> White-label Reporting</li>
                  <li className="flex gap-x-3"><CheckCircle2 className="h-6 w-5 flex-none text-[#2563EB] md:dark:text-blue-400" /> Team Members</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-16 md:py-24 lg:py-32 bg-white dark:bg-[#1E293B] transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 w-full">
            <h2 className="text-center text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#0F172A] md:dark:text-white mb-10 md:mb-16">
              Loved by thousands of SEO professionals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-[#F8FAFC] md:dark:bg-[#0F172A] p-6 md:p-8 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 w-full">
                  <p className="text-sm md:text-base text-[#475569] md:dark:text-slate-400 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#DBEAFE] md:dark:bg-blue-900/50 flex items-center justify-center text-[#2563EB] md:dark:text-blue-400 font-bold text-base md:text-lg shrink-0">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A] md:dark:text-white">{testimonial.name}</h4>
                      <p className="text-xs text-[#64748B] md:dark:text-slate-400">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="bg-blue-600 rounded-lg p-1">
                <TrendingUp className="w-5 h-5 text-white" />
              </span>
              <span className="text-xl font-bold tracking-tight">Sovira SEO</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md">
              The premium ecosystem for professional online and AI faceless storytellers. High-CPM scripts, cinematic visuals, and neural narration.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Integrations</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} Sovira SEO. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">LinkedIn</Link>
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">YouTube</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
