-- Migration: Ensure all required columns exist on user_progress
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DO blocks)

DO $$
BEGIN
  -- show_sbl_word (bool) — reading mode setting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'show_sbl_word'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN show_sbl_word boolean NOT NULL DEFAULT true;
  END IF;

  -- show_sbl_letter (bool) — reading mode setting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'show_sbl_letter'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN show_sbl_letter boolean NOT NULL DEFAULT true;
  END IF;

  -- alphabet_progress (jsonb) — alphabet training level progress
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'alphabet_progress'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN alphabet_progress jsonb NOT NULL DEFAULT '{}';
  END IF;

  -- discovered_words_by_root (jsonb) — root → [word, ...] map
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'discovered_words_by_root'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN discovered_words_by_root jsonb NOT NULL DEFAULT '{}';
  END IF;

  -- chapters (jsonb) — per-chapter game state map
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'chapters'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN chapters jsonb NOT NULL DEFAULT '{}';
  END IF;

END $$;
