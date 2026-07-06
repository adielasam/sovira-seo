'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  { 
    q: "What is Sovira AI?", 
    a: "Sovira AI is an all-in-one AI-powered SEO platform designed to help you audit your site, find keywords, generate optimized content, and track your rankings on a global scale." 
  },
  { 
    q: "Does Sovira AI work for YouTube?", 
    a: "Yes! Sovira AI is specifically designed as an AI SEO tool for YouTube creators, helping you discover high-value keywords and optimize your video descriptions and titles for maximum reach." 
  },
  { 
    q: "Is there a free plan?", 
    a: "Yes, we offer a risk-free trial so you can experience the power of our AI audit and keyword tools before committing to a paid plan." 
  },
  { 
    q: "What makes Sovira AI different for creators?", 
    a: "Sovira AI combines technical SEO with advanced AI content generation, giving global creators access to enterprise-grade search volume data, rank tracking, and optimization tools in one seamless dashboard." 
  }
]

export function SeoFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#0A101F]">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Everything you need to know about Sovira AI and how it accelerates organic growth.
          </p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`rounded-2xl border transition-colors ${openIndex === index ? 'bg-white dark:bg-[#111827] border-blue-200 dark:border-blue-900/50 shadow-sm' : 'bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-slate-900 dark:text-white pr-6">
                  {faq.q}
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openIndex === index ? 'rotate-180 text-blue-500' : ''}`} />
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-5 text-slate-600 dark:text-slate-300 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
