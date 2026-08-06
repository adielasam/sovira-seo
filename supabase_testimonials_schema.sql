-- Testimonials Schema

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  quote TEXT NOT NULL,
  img TEXT,
  permission_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public read access to testimonials where permission is granted
CREATE POLICY "Allow public read access to permitted testimonials" 
  ON testimonials 
  FOR SELECT 
  USING (permission_granted = TRUE);

-- Admins/owners could manage them (assuming service role manages them for now)

-- Note: Seed data to be inserted manually by admin in Supabase dashboard.
