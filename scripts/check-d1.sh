#!/usr/bin/env bash
# Runs spot-check SELECT queries against the remote D1 database.
# CI=true bypasses the wrangler interactive confirmation prompt.
set -e
DB="hebrew-lexicon"
W="CI=true npx wrangler d1 execute $DB --remote --command"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  D1 hebrew-lexicon verification"
echo "══════════════════════════════════════════════════════════════"

run() {
  local label="$1"; shift
  echo ""
  echo "── $label ──────────────────────────────────────────"
  eval $W "\"$1\""
}

# 1. Type × language distribution
run "1. TYPE DISTRIBUTION" \
  "SELECT type, language, COUNT(*) AS count FROM dstrongs_chains GROUP BY type, language ORDER BY count DESC;"

# 2. Elohim fix
run "2. ELOHIM {H0430G} (expect: type=lemma, SBL=ʼĕlôhîym, root=[H433])" \
  "SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations FROM dstrongs_chains WHERE dstrongs_chain LIKE '%H0430G%' LIMIT 5;"

# 3. Direct object marker
run "3. ETH {H0853} variants (bare form should be lemma)" \
  "SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations FROM dstrongs_chains WHERE dstrongs_chain LIKE '%H0853%' LIMIT 8;"

# 4. Bereshit
run "4. BERESHIT {H7225G} (root must be [H7218], NOT [HH...])" \
  "SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations FROM dstrongs_chains WHERE dstrongs_chain LIKE '%H7225G%' LIMIT 5;"

# 5. Double-H bug (must be 0)
run "5. DOUBLE-H BUG (expect count=0)" \
  "SELECT COUNT(*) AS double_H_bug FROM dstrongs_chains WHERE dstrongs_chain LIKE '%[HH%';"

# 6. Lemmas without resolved root
run "6. LEMMAS WITHOUT ROOT (primitives are ok)" \
  "SELECT COUNT(*) AS lemmas_no_root FROM dstrongs_chains WHERE type='lemma' AND dstrongs_chain NOT LIKE '%/[H%';"

# 7. Particles
run "7. ALL PARTICLE ROWS" \
  "SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations FROM dstrongs_chains WHERE type='particle';"

# 8. Genesis 1:1 tokens
run "8. GENESIS 1:1 TOKENS" \
  "SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations FROM dstrongs_chains WHERE dstrongs_chain IN ('H9003/{H7225G}/[H7218]','{H1254A}/[H1254]','{H0430G}/[H433]','{H0853}/[H853]','H9009/{H8064}/[H8064]','H9001/{H0776}/[H776]');"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✅ All checks complete"
echo "══════════════════════════════════════════════════════════════"
