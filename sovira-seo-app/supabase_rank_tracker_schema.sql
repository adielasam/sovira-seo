-- Add rank_history JSONB column to tracked_keywords
ALTER TABLE tracked_keywords 
ADD COLUMN IF NOT EXISTS rank_history JSONB DEFAULT '[]'::jsonb;

-- Example rank_history structure:
-- [
--   { "date": "2026-06-30T12:00:00Z", "rank": 5 },
--   { "date": "2026-07-01T12:00:00Z", "rank": 3 }
-- ]

-- Notify postgrest to reload schema
NOTIFY pgrst, 'reload schema';
