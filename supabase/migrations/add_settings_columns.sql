-- Migration: add show_gloss, show_tahot columns (Main Game)
-- and fc_settings column (Full Chapter panel settings)
-- Run in Supabase SQL editor:
--   https://app.supabase.com → SQL Editor → New Query → paste & run

DO $$
BEGIN
  -- show_gloss — Main Game: toggle word gloss under Hebrew
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'show_gloss'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN show_gloss boolean NOT NULL DEFAULT true;
  END IF;

  -- show_tahot — Main Game: TAHOT strip visibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'show_tahot'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN show_tahot boolean NOT NULL DEFAULT true;
  END IF;

  -- fc_settings — Full Chapter panel: stores showGloss, showSBLWord, showSBLLetter, fontSize as JSON
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'fc_settings'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN fc_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END
$$;
