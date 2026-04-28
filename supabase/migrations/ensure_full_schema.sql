-- Full schema migration for user_progress table
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times

-- 1. Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS user_progress (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_index      integer NOT NULL DEFAULT 1,
  discovered_roots jsonb NOT NULL DEFAULT '[]',
  completed_verses jsonb NOT NULL DEFAULT '[]',
  word_encounters  jsonb NOT NULL DEFAULT '{}',
  current_verse_index integer NOT NULL DEFAULT 0,
  typed_counts     jsonb NOT NULL DEFAULT '{}',
  active_word_idx  integer NOT NULL DEFAULT 0,
  highest_verse    integer NOT NULL DEFAULT 0,
  carousel_idx_map jsonb NOT NULL DEFAULT '{}',
  celebrated_verses jsonb NOT NULL DEFAULT '[]',
  show_sbl_word    boolean NOT NULL DEFAULT true,
  show_sbl_letter  boolean NOT NULL DEFAULT true,
  alphabet_progress jsonb NOT NULL DEFAULT '{}',
  discovered_words_by_root jsonb NOT NULL DEFAULT '{}',
  chapters         jsonb NOT NULL DEFAULT '{}',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 2. Add any missing columns to an existing table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'stage_index') THEN
    ALTER TABLE user_progress ADD COLUMN stage_index integer NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'discovered_roots') THEN
    ALTER TABLE user_progress ADD COLUMN discovered_roots jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'completed_verses') THEN
    ALTER TABLE user_progress ADD COLUMN completed_verses jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'word_encounters') THEN
    ALTER TABLE user_progress ADD COLUMN word_encounters jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'current_verse_index') THEN
    ALTER TABLE user_progress ADD COLUMN current_verse_index integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'typed_counts') THEN
    ALTER TABLE user_progress ADD COLUMN typed_counts jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'active_word_idx') THEN
    ALTER TABLE user_progress ADD COLUMN active_word_idx integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'highest_verse') THEN
    ALTER TABLE user_progress ADD COLUMN highest_verse integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'carousel_idx_map') THEN
    ALTER TABLE user_progress ADD COLUMN carousel_idx_map jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'celebrated_verses') THEN
    ALTER TABLE user_progress ADD COLUMN celebrated_verses jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'show_sbl_word') THEN
    ALTER TABLE user_progress ADD COLUMN show_sbl_word boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'show_sbl_letter') THEN
    ALTER TABLE user_progress ADD COLUMN show_sbl_letter boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'alphabet_progress') THEN
    ALTER TABLE user_progress ADD COLUMN alphabet_progress jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'discovered_words_by_root') THEN
    ALTER TABLE user_progress ADD COLUMN discovered_words_by_root jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'chapters') THEN
    ALTER TABLE user_progress ADD COLUMN chapters jsonb NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'updated_at') THEN
    ALTER TABLE user_progress ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- 3. Verify what was created (run this to confirm)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
ORDER BY ordinal_position;
