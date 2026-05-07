-- D1 Verification Queries
-- Run: npx wrangler d1 execute hebrew-lexicon --remote --file=./scripts/check-d1.sql

-- 1. Row counts by type × language
SELECT '=== 1. TYPE DISTRIBUTION ===' AS section;
SELECT type, language, COUNT(*) AS count
FROM dstrongs_chains
GROUP BY type, language
ORDER BY count DESC;

-- 2. Elohim H0430G fix
SELECT '=== 2. ELOHIM H0430G (expect: lemma, sbl=elohiym, root=[H433]) ===' AS section;
SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations, source_note
FROM dstrongs_chains
WHERE dstrongs_chain LIKE '%H0430G%'
LIMIT 5;

-- 3. Direct object marker H0853
SELECT '=== 3. ETH H0853 variants (expect: lemma for bare form) ===' AS section;
SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations
FROM dstrongs_chains
WHERE dstrongs_chain LIKE '%H0853%'
LIMIT 8;

-- 4. Bereshit H7225G (root must be [H7218], NOT [HH7218])
SELECT '=== 4. BERESHIT H7225G (expect root [H7218]) ===' AS section;
SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations
FROM dstrongs_chains
WHERE dstrongs_chain LIKE '%H7225G%'
LIMIT 5;

-- 5. Double-H bug check (expect 0)
SELECT '=== 5. DOUBLE-H BUG CHECK (expect count=0) ===' AS section;
SELECT COUNT(*) AS double_H_bug_count
FROM dstrongs_chains
WHERE dstrongs_chain LIKE '%[HH%';

-- 6. Lemmas without a root resolved
SELECT '=== 6. LEMMAS WITHOUT ROOT (should be small, primitives ok) ===' AS section;
SELECT COUNT(*) AS lemmas_without_root
FROM dstrongs_chains
WHERE type = 'lemma'
  AND dstrongs_chain NOT LIKE '%/[H%';

-- 7. Particles
SELECT '=== 7. PARTICLE ROWS ===' AS section;
SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations
FROM dstrongs_chains
WHERE type = 'particle'
LIMIT 30;

-- 8. Genesis 1:1 tokens
SELECT '=== 8. GENESIS 1:1 TOKENS ===' AS section;
SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations, glosses
FROM dstrongs_chains
WHERE dstrongs_chain IN (
  'H9003/{H7225G}/[H7218]',
  '{H1254A}/[H1254]',
  '{H0430G}/[H433]',
  '{H0853}/[H853]',
  'H9009/{H8064}/[H8064]',
  'H9001/{H0776}/[H776]'
);
