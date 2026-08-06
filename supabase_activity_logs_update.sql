-- Phase 3: Add city column to activity logs for Social Proof Widget
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS city TEXT;
