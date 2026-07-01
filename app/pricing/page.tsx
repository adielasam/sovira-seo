'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowRight, Zap, Shield, Sparkles, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUserProfile, updateUserPlan } from '@/app/(dashboard)/settings/actions'

const tiers = [
  {
    name: 'Starter',
    id: 'tier-starter',
    price: { monthly: 29, annually: 290 },
    description: 'Perfect for small websites and individual bloggers just getting started with SEO.',
    features: [
      'Track up to 50 keywords',
      '50 SEO Audits per month',
      '10,000 AI words per month',
      'Basic Competitor Analysis',
      'Standard Support',
      '1 User Seat',
    ],
    icon: Zap,
  },
  {
    name: 'Pro',
    id: 'tier-pro',
    price: { monthly: 79, annually: 790 },
    description: 'Ideal for growing businesses and agencies needing comprehensive SEO tools.',
    features: [
      'Track up to 500 keywords',
      'Unlimited SEO Audits',
      '100,000 AI words per month',
      'Advanced Competitor Analysis',
      'Priority Email Support',
      '5 User Seats',
      'White-label Reports',
      'API Access',
    ],
    mostPopular: true,
    icon: Sparkles,
  },
  {
    name: 'Agency',
    id: 'tier-agency',
    price: { monthly: 199, annually: 1990 },
    description: 'For large teams and enterprises requiring maximum power and limits.',
    features: [
      'Track up to 5,000 keywords',
      'Unlimited SEO Audits',
      'Unlimited AI words',
      'Deep Competitor Analysis',
      '24/7 Phone & Email Support',
      'Unlimited User Seats',
      'Custom White-labeling',
      'Dedicated Account Manager',
    ],
    icon: Building2,
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
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

  const handleSubscribe = async (planName: string, amount: number) => {
    if (!user) {
      toast.error('Please log in or create an account first.', { icon: '🔒' })
      router.push('/auth/login?redirect=/pricing')
      return
    }

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      toast.error('Paystack key not configured')
      return
    }
    
    // Map USD to NGN for Paystack logic
    let ngnAmount = 0
    const lowerPlan = planName.toLowerCase()
    if (lowerPlan === 'starter') ngnAmount = annual ? 290000 : 29000
    else if (lowerPlan === 'pro') ngnAmount = annual ? 790000 : 79000
    else if (lowerPlan === 'agency') ngnAmount = annual ? 1990000 : 199000

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
    <div className="bg-slate-50 dark:bg-[#0F172A] min-h-screen py-24 sm:py-32 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Sovira SEO</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Pricing that scales with your growth
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Choose the perfect plan for your SEO needs. Simple, transparent pricing with no hidden fees. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-3 p-1 rounded-xl bg-slate-200 dark:bg-slate-800 ring-1 ring-inset ring-slate-200 dark:ring-slate-700/50">
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !annual 
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                annual 
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Annual billing
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wider">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-3xl p-8 xl:p-10 transition-all duration-300 ${
                tier.mostPopular
                  ? 'bg-blue-600 text-white shadow-xl scale-105 z-10 ring-2 ring-blue-600'
                  : 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 hover:shadow-lg'
              }`}
            >
              {tier.mostPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-blue-200 text-blue-800 text-xs font-bold uppercase tracking-widest shadow-sm">
                  Most Popular
                </div>
              )}
              <div className="flex items-center justify-between gap-x-4 mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <tier.icon className={`w-6 h-6 ${tier.mostPopular ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`} />
                  {tier.name}
                </h3>
              </div>
              <p className={`text-sm leading-6 mb-6 ${tier.mostPopular ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {tier.description}
              </p>
              <div className="mt-2 flex items-baseline gap-x-1">
                <span className="text-5xl font-bold tracking-tight">
                  ${Math.round(annual ? tier.price.annually / 12 : tier.price.monthly)}
                </span>
                <span className={`text-sm font-semibold leading-6 ${tier.mostPopular ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  /month
                </span>
              </div>
              {annual && (
                <p className={`text-sm mt-1 ${tier.mostPopular ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                  Billed ${tier.price.annually} annually
                </p>
              )}
              
              <button
                onClick={() => handleSubscribe(tier.name, annual ? tier.price.annually : tier.price.monthly)}
                className={`mt-8 w-full rounded-xl px-4 py-3.5 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                  tier.mostPopular
                    ? 'bg-white text-blue-600 hover:bg-slate-50 shadow-sm'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm hover:shadow-blue-500/25'
                }`}
              >
                Get started today
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <ul className={`mt-10 space-y-4 text-sm leading-6 flex-1 ${tier.mostPopular ? 'text-blue-50' : 'text-slate-600 dark:text-slate-300'}`}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className={`h-6 w-5 flex-none ${tier.mostPopular ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
