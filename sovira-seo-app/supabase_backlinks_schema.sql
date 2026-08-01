CREATE TABLE IF NOT EXISTS backlinks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_domain TEXT NOT NULL,
  source_url TEXT NOT NULL,
  target_page TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  domain_authority INTEGER NOT NULL DEFAULT 1,
  spam_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE backlinks ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own backlinks
CREATE POLICY "Users can manage their own backlinks" ON backlinks
  FOR ALL USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
