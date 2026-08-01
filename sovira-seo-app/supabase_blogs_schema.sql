-- SQL script to create the blog_posts table with SEO optimization
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT false,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published blogs
CREATE POLICY "Public can view published blogs"
ON blog_posts FOR SELECT
USING (published = true);

-- Allow admins to read all blogs (including drafts)
CREATE POLICY "Admins can view all blogs"
ON blog_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  )
  OR auth.email() = 'microsoftportharcourt@gmail.com'
);

-- Allow admins to insert blogs
CREATE POLICY "Admins can insert blogs"
ON blog_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  )
  OR auth.email() = 'microsoftportharcourt@gmail.com'
);

-- Allow admins to update blogs
CREATE POLICY "Admins can update blogs"
ON blog_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  )
  OR auth.email() = 'microsoftportharcourt@gmail.com'
);

-- Allow admins to delete blogs
CREATE POLICY "Admins can delete blogs"
ON blog_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  )
  OR auth.email() = 'microsoftportharcourt@gmail.com'
);

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_updated_at_column();
