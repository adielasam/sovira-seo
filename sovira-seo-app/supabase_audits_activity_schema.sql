-- Create audits table
CREATE TABLE IF NOT EXISTS audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audits
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own audits" ON audits
  FOR ALL USING (auth.uid() = user_id);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own activity logs" ON activity_logs
  FOR ALL USING (auth.uid() = user_id);

-- Grant privileges to authenticated users
GRANT ALL ON TABLE public.audits TO authenticated;
GRANT ALL ON TABLE public.audits TO service_role;

GRANT ALL ON TABLE public.activity_logs TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
