CREATE TABLE public.dashboard_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  generation_count INTEGER DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_generated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.dashboard_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard usage" 
ON public.dashboard_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard usage" 
ON public.dashboard_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard usage" 
ON public.dashboard_usage FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
