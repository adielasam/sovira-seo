ALTER TABLE public.content_generations ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
