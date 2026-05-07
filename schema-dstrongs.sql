-- Hebrew Bible Game — Unified dStrongs Chain Schema
-- Run (local):  npx wrangler d1 execute hebrew-lexicon --local --file=./schema-dstrongs.sql
-- Run (remote): npx wrangler d1 execute hebrew-lexicon --remote --file=./schema-dstrongs.sql

-- ---------------------------------------------------------------------------
-- dstrongs_chains — one row per unique morphological word form
--
-- PRIMARY KEY (dstrongs_chain) encodes the full morphological identity:
--
--   Type         PK format                          Example
--   -----------  ---------------------------------  --------------------------
--   particle     H9xxx                              H9003
--   root         [Hxxx]                             [H7218]
--   lemma        {Hxxx}/[Hroot]                     {H7225G}/[H7218]
--   opaque       <Hxxx>                             <H20>
--   inflected    prefix/{Hxxx}/suffix/[Hroot]       H9003/{H7225G}/[H7218]
--
-- Bracket notation is self-describing — type is derivable from the PK string.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dstrongs_chains (

  -- Identity
  dstrongs_chain        TEXT PRIMARY KEY,
  -- e.g. "H9003/{H7225G}/[H7218]", "[H7218]", "H9003", "<H20>"

  type                  TEXT NOT NULL,
  -- "particle" | "root" | "lemma" | "opaque" | "inflected"

  language              TEXT,
  -- "heb" (Hebrew) | "arc" (Aramaic)

  -- Hebrew text
  aleph_bet             TEXT,
  -- consonantal Hebrew, no nikud. e.g. "בראשית"
  -- for inflected forms: the full word e.g. "בְּרֵאשִׁית" (with nikud if available)

  -- Phonology — JSON array (one chain can have multiple attested pronunciations)
  sbl_transliterations  TEXT,
  -- e.g. '["be./re.Shit", "be./Re.shi.Tah"]'

  -- Semantics — JSON array (all contextual glosses seen across verse occurrences)
  glosses               TEXT,
  -- e.g. '["in beginning", "in [the] beginning of", "at [the] beginning of"]'

  -- Grammar
  pos                   TEXT,
  -- JSON array of all POS this word can be, from HebrewStrong
  -- e.g. '["n-f"]' or '["v", "n-m"]' for dual-use words

  -- Lexical sources
  bdb                   TEXT,
  -- Brown-Driver-Briggs lexical content (from BrownDriverBriggs.xml)

  source_note           TEXT,
  -- HebrewStrong <source> field etymology
  -- e.g. "from the same as H7218" | "a primitive root" | "of uncertain derivation"

  -- AI-generated content (populated in a second pass)
  explanation           TEXT,
  -- Morphological explanation written by AI using all above fields as context

  -- Timestamps
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

-- Index: look up all rows of a given type (e.g. all roots, all particles)
CREATE INDEX IF NOT EXISTS idx_dc_type     ON dstrongs_chains(type);

-- Index: look up by language
CREATE INDEX IF NOT EXISTS idx_dc_language ON dstrongs_chains(language);

-- Index: look up by Hebrew consonants (reverse lookup from UI click)
CREATE INDEX IF NOT EXISTS idx_dc_alephbet ON dstrongs_chains(aleph_bet);
