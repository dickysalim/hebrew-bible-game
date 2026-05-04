-- New lexicon schema: root + lemma tables
-- Run: npx wrangler d1 execute hebrew-lexicon --local --file=./schema-lexicon.sql

CREATE TABLE IF NOT EXISTS root (
  root_strongs    TEXT PRIMARY KEY,
  root_lang       TEXT,
  root_sbl        TEXT,
  root_pron       TEXT,
  root_pos        TEXT,
  root_gloss      TEXT,
  root_bdb        TEXT,
  root_word       TEXT,
  root_explanation TEXT,
  root_homonym    TEXT
);

CREATE TABLE IF NOT EXISTS lemma (
  lemma_strongs     TEXT PRIMARY KEY,
  lemma_lang        TEXT,
  lemma_sbl         TEXT,
  lemma_gloss       TEXT,
  lemma_bdb         TEXT,
  lemma_word        TEXT,
  lemma_root_strongs TEXT,
  lemma_explanation TEXT
);
