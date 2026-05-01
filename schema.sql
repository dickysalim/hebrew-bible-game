-- Hebrew Bible Game — D1 Lexicon Schema
-- Run once: npx wrangler d1 execute hebrew-lexicon --local --file=./schema.sql
-- For production: npx wrangler d1 execute hebrew-lexicon --remote --file=./schema.sql

-- ---------------------------------------------------------------------------
-- Words table
-- Each row = one inflected Hebrew word form as it appears in the text.
-- Key is the Hebrew consonants (no nikud), e.g. "בראשית"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS words (
  hebrew      TEXT PRIMARY KEY,   -- consonants only, e.g. "בראשית"
  word_sbl    TEXT,               -- SBL transliteration, e.g. "bĕrēʾšîṯ"
  gloss       TEXT,               -- short English gloss, e.g. "in the beginning"
  root        TEXT,               -- 3-letter root consonants, e.g. "ראש"
  pos         TEXT,               -- part of speech: noun, verb, particle, etc.
  prefix_sbl  TEXT,
  prefix_gloss TEXT,
  root_sbl    TEXT,
  root_gloss  TEXT,
  suffix_sbl  TEXT,
  suffix_gloss TEXT,
  segments    TEXT,               -- JSON blob: [{ type, letters, gloss }]
  explanation TEXT                -- rich 2-paragraph scholarly explanation
);

-- Index for root-based lookups (Lexicon: "show all words from root ראש")
CREATE INDEX IF NOT EXISTS idx_words_root ON words(root);

-- Index for POS filtering (Lexicon: "show all verbs")
CREATE INDEX IF NOT EXISTS idx_words_pos ON words(pos);

-- ---------------------------------------------------------------------------
-- Roots table
-- Each row = one Hebrew root (trilateral consonant set).
-- Key is the Strong's number as text, e.g. "7225"
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roots (
  strongs     TEXT PRIMARY KEY,   -- Strong's number as text, e.g. "7225"
  hebrew      TEXT,               -- Hebrew consonants, e.g. "ראש" (if known)
  sbl         TEXT,               -- SBL transliteration
  gloss       TEXT,               -- short English gloss
  bdb         TEXT,               -- BDB dictionary reference
  explanation TEXT                -- rich 2-paragraph scholarly explanation
);

-- Index for Hebrew consonant lookups (look up root by its letters)
CREATE INDEX IF NOT EXISTS idx_roots_hebrew ON roots(hebrew);
