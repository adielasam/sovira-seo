import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY is missing')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify Paystack Signature
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const supabaseAdmin = await createAdminClient()

    // Handle different Paystack events
    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata, plan } = event.data
      
      // Determine user_id from metadata (passed during initialization)
      const userId = metadata?.user_id
      const planId = metadata?.plan_id || 'pro' // Defaulting to pro if not specified

      if (userId) {
        // 1. Record the transaction
        await supabaseAdmin.from('payment_transactions').insert({
          user_id: userId,
          paystack_reference: reference,
          amount: amount,
          status: 'success',
          plan_id: planId,
        } as any)

        // 2. Update the user's subscription
        // For a real app, calculate current_period_end based on the plan duration (e.g. +30 days)
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        await supabaseAdmin.from('subscriptions').update({
          plan_id: planId,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
          // Reset limits based on plan (Example values)
          keyword_limit: planId === 'pro' ? 100 : planId === 'elite' ? 500 : 10,
          audit_limit: planId === 'pro' ? 20 : planId === 'elite' ? 100 : 3,
          ai_words_limit: planId === 'pro' ? 50000 : planId === 'elite' ? 200000 : 5000,
          updated_at: new Date().toISOString()
        } as any).eq('user_id', userId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
