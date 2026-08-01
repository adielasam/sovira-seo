-- Add CMS Integration columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS cms_provider TEXT,
ADD COLUMN IF NOT EXISTS wp_url TEXT,
ADD COLUMN IF NOT EXISTS wp_username TEXT,
ADD COLUMN IF NOT EXISTS wp_app_password TEXT,
ADD COLUMN IF NOT EXISTS cms_connected_at TIMESTAMPTZ;
