-- Exact schema — matches remote D1
-- Run: npx wrangler d1 execute hebrew-lexicon --local --file=./schema-reset-local.sql

DROP TABLE IF EXISTS roots;
DROP TABLE IF EXISTS lemma;

CREATE TABLE roots (
  root_strongs    TEXT PRIMARY KEY,
  root_lang       TEXT,
  root_sbl        TEXT,
  root_gloss      TEXT,
  root_bdb        TEXT,
  root_word       TEXT,
  root_explanation TEXT
);

CREATE TABLE lemma (
  lemma_strongs     TEXT PRIMARY KEY,
  lemma_lang        TEXT,
  lemma_sbl         TEXT,
  lemma_gloss       TEXT,
  lemma_bdb         TEXT,
  lemma_word        TEXT,
  lemma_root_strongs TEXT,
  lemma_explanation TEXT
);
