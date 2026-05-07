#!/usr/bin/env node
/**
 * D1 Verification Script
 * Runs spot-check queries against the hebrew-lexicon database.
 * Usage: node scripts/check-d1.mjs
 */
import { execSync } from 'child_process';

const DB = 'hebrew-lexicon';

function query(label, sql) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔍 ${label}`);
  console.log(`${'─'.repeat(60)}`);
  try {
    const result = execSync(
      `npx wrangler d1 execute ${DB} --remote --json --command "${sql.replace(/"/g, '\\"')}"`,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    // wrangler --json returns an array of result sets
    const parsed = JSON.parse(result);
    const rows = parsed?.[0]?.results ?? parsed?.results ?? parsed;
    if (Array.isArray(rows) && rows.length > 0) {
      console.table(rows);
    } else {
      console.log('  (no rows)');
    }
  } catch (err) {
    const output = err.stdout || err.stderr || err.message;
    console.error('  ERROR:', output.slice(0, 400));
  }
}

// ── 1. Distribution by type + language ──────────────────────────
query(
  'Row counts by type × language',
  `SELECT type, language, COUNT(*) AS count
   FROM dstrongs_chains
   GROUP BY type, language
   ORDER BY count DESC`
);

// ── 2. Key fixes spot-check ──────────────────────────────────────
query(
  'Spot-check: Elohim H0430G (should be lemma, single SBL, root H433)',
  `SELECT dstrongs_chain, type, sbl_transliterations, source_note
   FROM dstrongs_chains
   WHERE dstrongs_chain LIKE '%H0430G%'
   LIMIT 3`
);

query(
  'Spot-check: Direct object marker H0853 (should be lemma, SBL = êth)',
  `SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations
   FROM dstrongs_chains
   WHERE dstrongs_chain LIKE '%H0853%'
   LIMIT 5`
);

query(
  'Spot-check: bereshit H7225G (should have root [H7218], NOT [HH7218])',
  `SELECT dstrongs_chain, type, sbl_transliterations, source_note
   FROM dstrongs_chains
   WHERE dstrongs_chain LIKE '%H7225G%'
   LIMIT 3`
);

// ── 3. Sanity: no double-H roots ────────────────────────────────
query(
  'Sanity: entries with double-H bug [HH...] (should be 0)',
  `SELECT COUNT(*) AS double_H_count
   FROM dstrongs_chains
   WHERE dstrongs_chain LIKE '%[HH%'`
);

// ── 4. Sanity: remaining zero-padded lookup failures ────────────
query(
  'Sanity: lemma entries with no root resolved (should be small)',
  `SELECT COUNT(*) AS lemmas_without_root
   FROM dstrongs_chains
   WHERE type = 'lemma'
     AND dstrongs_chain NOT LIKE '%/[H%'`
);

// ── 5. Particles ─────────────────────────────────────────────────
query(
  'Particles: all H9xxx entries',
  `SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations
   FROM dstrongs_chains
   WHERE type = 'particle'
   LIMIT 30`
);

// ── 6. SBL sample: roots ─────────────────────────────────────────
query(
  'Sample: 5 root entries',
  `SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations, glosses
   FROM dstrongs_chains
   WHERE type = 'root'
   LIMIT 5`
);

// ── 7. Genesis 1:1 tokens (bereshit, bara, elohim, et, hashamayim, et, haaretz) ─
const genesis11 = [
  'H9003/{H7225G}/[H7218]',  // bereshit
  '{H1254A}/[H1254]',         // bara
  '{H0430G}/[H433]',          // elohim
  '{H0853}/[H853]',           // et (obj marker)
  'H9009/{H8064}/[H8064]',   // hashamayim
  'H9001/{H0776}/[H776]',    // ve'et ha'aretz — simplified check
];
const g11IN = genesis11.map(c => `'${c}'`).join(',');
query(
  'Genesis 1:1 tokens',
  `SELECT dstrongs_chain, type, aleph_bet, sbl_transliterations, glosses
   FROM dstrongs_chains
   WHERE dstrongs_chain IN (${g11IN})`
);

console.log(`\n${'═'.repeat(60)}`);
console.log('✅ Verification complete.');
