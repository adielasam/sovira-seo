-- Affiliate Profiles Table
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  referral_code TEXT UNIQUE NOT NULL,
  balance_ngn DECIMAL(12, 2) DEFAULT 0.00,
  total_earned_ngn DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Affiliate Referrals Table
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  referring_affiliate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Affiliate Earnings Table
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_reference TEXT,
  amount_paid_ngn DECIMAL(12, 2),
  commission_earned_ngn DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Affiliate Withdrawals Table
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies

-- Affiliate Profiles RLS
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own affiliate profile" ON public.affiliate_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all affiliate profiles" ON public.affiliate_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Affiliate Referrals RLS
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read affiliate referrals" ON public.affiliate_referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Affiliate Earnings RLS
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own earnings" ON public.affiliate_earnings FOR SELECT USING (auth.uid() = affiliate_id);
CREATE POLICY "Admins can manage earnings" ON public.affiliate_earnings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Affiliate Withdrawals RLS
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own withdrawals" ON public.affiliate_withdrawals FOR SELECT USING (auth.uid() = affiliate_id);
CREATE POLICY "Users can insert own withdrawals" ON public.affiliate_withdrawals FOR INSERT WITH CHECK (auth.uid() = affiliate_id);
CREATE POLICY "Admins can manage withdrawals" ON public.affiliate_withdrawals FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
