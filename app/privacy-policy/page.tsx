import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white p-6 py-16 md:py-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
          <p>
            Welcome to Sovira SEO. This Privacy Policy outlines how we collect, use, and protect your information when you use our platform.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">1. Information We Collect</h2>
          <p>We only collect the information absolutely necessary to provide you with our services. This includes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Your email address and basic profile details securely managed via Supabase Authentication.</li>
            <li><strong>Billing Information:</strong> Payment details securely processed by Paystack/Stripe. We do not store your raw credit card data on our servers.</li>
            <li><strong>Usage Data:</strong> Data related to the SEO audits, tracked keywords, and content generated within the application to provide you historical logs and reporting.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">2. How We Use Your Information</h2>
          <p>Your information is used strictly to operate, maintain, and improve the Sovira SEO platform:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To authenticate your login and secure your workspace.</li>
            <li>To process your subscription payments.</li>
            <li>To provide customer support and service updates.</li>
          </ul>
          <p><strong>We do not sell your personal data to third parties. We do not use third-party advertising trackers.</strong></p>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">3. Data Security</h2>
          <p>
            We implement industry-standard security measures, including data encryption in transit and at rest, powered by Supabase. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">4. Third-Party Services</h2>
          <p>We integrate with a few trusted third-party services to provide our core features:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase:</strong> For secure database hosting and authentication.</li>
            <li><strong>Paystack / Stripe:</strong> For secure payment processing.</li>
            <li><strong>AI Providers:</strong> (e.g., Google Gemini, Groq, Apify) to generate content and audits. We do not send your personal account details to these AI providers, only the necessary prompts and target URLs.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">5. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information at any time. You can do this directly from your account settings or by contacting our support team.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8">6. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us at: <a href="https://wa.me/2348162337303" className="text-blue-600 dark:text-blue-400 hover:underline">WhatsApp Support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
