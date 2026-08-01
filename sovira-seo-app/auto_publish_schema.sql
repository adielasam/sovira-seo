-- Schema updates for Auto-Publishing and Blogger Integration

-- 1. Add Blogger credentials
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS blogger_access_token text,
ADD COLUMN IF NOT EXISTS blogger_refresh_token text,
ADD COLUMN IF NOT EXISTS blogger_blog_id text;

-- 2. Add Auto-Publishing Settings
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS auto_publish_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_publish_frequency text DEFAULT 'daily', -- 'daily', 'weekly', etc.
ADD COLUMN IF NOT EXISTS auto_publish_topics text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_auto_published_at timestamp with time zone;

-- Optional: Create an index on auto_publish_enabled to make the cron query faster
CREATE INDEX IF NOT EXISTS idx_user_profiles_auto_publish 
ON user_profiles(auto_publish_enabled) 
WHERE auto_publish_enabled = true;
