-- Verse Notes table — stores per-verse study notes for each user
-- Run in Supabase Dashboard → SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS verse_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book        text NOT NULL,
  chapter     integer NOT NULL,
  verse       integer NOT NULL,
  content     text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);

-- 2. Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_verse_notes_user
  ON verse_notes(user_id, book, chapter, verse);

-- 3. Enable Row Level Security
ALTER TABLE verse_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — users can only access their own notes
CREATE POLICY "Users can view their own notes"
  ON verse_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON verse_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON verse_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON verse_notes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'verse_notes'
ORDER BY ordinal_position;
