-- 1. Add new columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS marketing_emails_opt_out BOOLEAN NOT NULL DEFAULT false;

-- 2. Create emails_sent table
CREATE TABLE IF NOT EXISTS public.emails_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, email_type)
);

-- Enable RLS on emails_sent
ALTER TABLE public.emails_sent ENABLE ROW LEVEL SECURITY;

-- We don't necessarily need RLS policies for public users if it's only accessed via service_role in Cron/Admin, 
-- but we can add a basic read policy just in case the app needs to show it later.
CREATE POLICY "Users can view their own sent emails"
    ON public.emails_sent
    FOR SELECT
    USING (auth.uid() = user_id);
