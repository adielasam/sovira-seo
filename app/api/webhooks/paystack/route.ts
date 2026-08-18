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

        // 3. Process Affiliate Commission (5%)
        const { data: referral } = await supabaseAdmin
          .from('affiliate_referrals')
          .select('referring_affiliate_id')
          .eq('referred_user_id', userId)
          .single()

        if (referral?.referring_affiliate_id) {
          const amountNgn = amount / 100 // Paystack sends amounts in kobo (cents)
          const commission = amountNgn * 0.05 // 5% commission

          // Insert into earnings
          await supabaseAdmin.from('affiliate_earnings').insert({
            affiliate_id: referral.referring_affiliate_id,
            referred_user_id: userId,
            transaction_reference: reference,
            amount_paid_ngn: amountNgn,
            commission_earned_ngn: commission
          })

          // Update affiliate's balance
          // Note: using RPC for atomic increment is better, but doing a select/update for simplicity if no RPC exists
          const { data: affiliate } = await supabaseAdmin
            .from('affiliate_profiles')
            .select('balance_ngn, total_earned_ngn')
            .eq('user_id', referral.referring_affiliate_id)
            .single()

          if (affiliate) {
            await supabaseAdmin.from('affiliate_profiles').update({
              balance_ngn: Number(affiliate.balance_ngn || 0) + commission,
              total_earned_ngn: Number(affiliate.total_earned_ngn || 0) + commission
            }).eq('user_id', referral.referring_affiliate_id)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
