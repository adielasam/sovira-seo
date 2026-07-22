-- =============================================
-- Sovira SEO — Teacher Tools: Scheme of Work
-- 4 new tables, RLS policies, triggers
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. scheme_of_work: One row per subject/class/term
CREATE TABLE IF NOT EXISTS scheme_of_work (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  term TEXT NOT NULL,
  raw_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. sow_weekly_entries: Parsed weekly breakdown
CREATE TABLE IF NOT EXISTS sow_weekly_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sow_id UUID REFERENCES scheme_of_work(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  topic TEXT NOT NULL,
  sub_topic TEXT,
  objectives TEXT,
  content_summary TEXT,
  activities TEXT,
  resources TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. teacher_lesson_notes: Saved lesson notes
CREATE TABLE IF NOT EXISTS teacher_lesson_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sow_entry_id UUID REFERENCES sow_weekly_entries(id),
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  term TEXT NOT NULL,
  week_number INT NOT NULL,
  topic TEXT NOT NULL,
  lesson_note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. teacher_questions: Generated question sets
CREATE TABLE IF NOT EXISTS teacher_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_note_id UUID REFERENCES teacher_lesson_notes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'mixed',
  questions TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE scheme_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_weekly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_questions ENABLE ROW LEVEL SECURITY;

-- scheme_of_work: Anyone authenticated can read, only uploaders can insert
CREATE POLICY "Anyone can read schemes" ON scheme_of_work
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert schemes" ON scheme_of_work
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can update their schemes" ON scheme_of_work
  FOR UPDATE TO authenticated USING (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can delete their schemes" ON scheme_of_work
  FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

-- sow_weekly_entries: Anyone authenticated can read
CREATE POLICY "Anyone can read weekly entries" ON sow_weekly_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert entries" ON sow_weekly_entries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update entries" ON sow_weekly_entries
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete entries" ON sow_weekly_entries
  FOR DELETE TO authenticated USING (true);

-- teacher_lesson_notes: Users can only access their own
CREATE POLICY "Users read own lesson notes" ON teacher_lesson_notes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lesson notes" ON teacher_lesson_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lesson notes" ON teacher_lesson_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own lesson notes" ON teacher_lesson_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- teacher_questions: Users can only access their own
CREATE POLICY "Users read own questions" ON teacher_questions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own questions" ON teacher_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own questions" ON teacher_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own questions" ON teacher_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_teacher_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheme_of_work_updated_at
  BEFORE UPDATE ON scheme_of_work
  FOR EACH ROW EXECUTE FUNCTION update_teacher_updated_at();

CREATE TRIGGER update_teacher_lesson_notes_updated_at
  BEFORE UPDATE ON teacher_lesson_notes
  FOR EACH ROW EXECUTE FUNCTION update_teacher_updated_at();

-- =============================================
-- Grants & Cache Reload
-- =============================================

GRANT ALL ON TABLE public.scheme_of_work TO authenticated;
GRANT ALL ON TABLE public.sow_weekly_entries TO authenticated;
GRANT ALL ON TABLE public.teacher_lesson_notes TO authenticated;
GRANT ALL ON TABLE public.teacher_questions TO authenticated;

NOTIFY pgrst, 'reload schema';
