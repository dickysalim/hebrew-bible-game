#!/usr/bin/env node
/**
 * fill-deep-explanations.mjs
 *
 * Queries contextual_word_meaning in D1 for rows with NULL contextual_meaning,
 * calls DeepSeek to generate a contextual linguistic explanation,
 * and writes the result back to D1 via the Cloudflare REST API.
 *
 * Environment variables (required):
 *   CLOUDFLARE_ACCOUNT_ID      – Cloudflare account ID
 *   CLOUDFLARE_D1_DATABASE_ID  – D1 database ID (uuid)
 *   CLOUDFLARE_API_TOKEN       – API token with D1 Edit permission
 *   DEEPSEEK_API_KEY           – DeepSeek API key
 *
 * Configuration (optional overrides via env):
 *   MAX_ROWS          – Maximum rows to process per run   (default: 100)
 *   RATE_LIMIT_MS     – Delay between DeepSeek calls (ms) (default: 500)
 *   BOOK_FILTER       – Book to process (default: Gen)
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_TOKEN    = process.env.CLOUDFLARE_API_TOKEN;
const DS_KEY      = process.env.DEEPSEEK_API_KEY;

const MAX_ROWS      = parseInt(process.env.MAX_ROWS     ?? '100', 10);
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS ?? '500', 10);
const BOOK_FILTER   = process.env.BOOK_FILTER ?? 'Gen';

const DEEPSEEK_MODEL  = 'deepseek-chat';
const DEEPSEEK_URL    = 'https://api.deepseek.com/chat/completions';
const CF_D1_BASE      = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Biblical Hebrew linguist writing word explanations for language learners reading the Hebrew Bible in canonical order. Your audience is NOT Hebrew-native — write in plain, accessible English.

RULES:
1. Aim for 2 short paragraphs. If a third is truly needed for clarity, that's okay — but never more than 3. No headers, no bullet lists, no markdown formatting.
2. Every time you mention a Hebrew word in your explanation, write it in CONSONANT-ONLY form (no nikud/vowel points), ALWAYS followed by its SBL transliteration in parentheses. Example: ראש (rosh), not רֹאשׁ. No exceptions — the reader relies on the transliteration to know how to read it.
3. Use simple, everyday language. Avoid jargon like "construct state", "temporal adverbial", or "morphophonemic." If you must use a grammar term, explain it in plain words right after.
4. Linguistics ONLY — no theological claims, devotional commentary, or interpretive traditions. Stick to word origins, word-building patterns, and how the word works in the sentence.
5. If the word has a root, explain how this form is built from that root. Point out interesting patterns (e.g., added endings, prefix patterns, vowel changes) in a way a beginner can follow.
6. The learner encounters words in order by word_order. If this root appeared earlier, acknowledge it: "You've seen this root before…" If it's the first time, say so. If a familiar word shows up in a surprising form or meaning, call that out.
7. Ground the explanation in THIS verse — show what the word does here, not a generic dictionary definition.
8. For prefixed/suffixed words, briefly note what each piece adds (e.g., "The ב (be) at the start means 'in', attached to…").`;

// ─── Validation ──────────────────────────────────────────────────────────────

function assertEnv() {
  const missing = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_API_TOKEN', 'DEEPSEEK_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── Cloudflare D1 REST helpers ──────────────────────────────────────────────

async function d1Query(sql, params = []) {
  const res = await fetch(`${CF_D1_BASE}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed [${res.status}]: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 API error: ${JSON.stringify(json.errors)}`);
  }

  return json.result?.[0]?.results ?? [];
}

/**
 * Fetch pending rows: non-particle words with NULL contextual_meaning.
 */
async function fetchPendingRows(limit) {
  const sql = `
    SELECT *
    FROM contextual_word_meaning
    WHERE contextual_meaning IS NULL
      AND is_particle = 0
      AND book = ?
    ORDER BY word_order ASC
    LIMIT ?
  `;
  return d1Query(sql, [BOOK_FILTER, limit]);
}

/**
 * Fetch all words in a specific verse (for context).
 */
async function fetchVerseWords(book, chapter, verse) {
  const sql = `
    SELECT heb_nikud, word_order
    FROM contextual_word_meaning
    WHERE book = ? AND chapter = ? AND verse = ?
    ORDER BY word_order ASC
  `;
  return d1Query(sql, [book, chapter, verse]);
}

/**
 * Count how many earlier words share the same root_code.
 */
async function countPriorRootOccurrences(rootCode, wordOrder) {
  if (!rootCode) return 0;
  const sql = `
    SELECT COUNT(*) as cnt
    FROM contextual_word_meaning
    WHERE root_code = ? AND word_order < ? AND root_code != ''
  `;
  const rows = await d1Query(sql, [rootCode, wordOrder]);
  return rows[0]?.cnt ?? 0;
}

/**
 * Write contextual_meaning back to D1.
 */
async function updateExplanation(book, chapter, verse, wordOrder, explanation) {
  const sql = `
    UPDATE contextual_word_meaning
    SET contextual_meaning = ?
    WHERE book = ? AND chapter = ? AND verse = ? AND word_order = ?
  `;
  await d1Query(sql, [explanation, book, chapter, verse, wordOrder]);
}

// ─── DeepSeek helper ─────────────────────────────────────────────────────────

function buildUserMessage(row, verseText, priorRootCount) {
  const lines = [
    `Explain the meaning of **${row.heb_nikud}** (${row.sbl_transliteration})`,
    `in ${row.book} ${row.chapter}:${row.verse}`,
    ``,
    `Full verse: ${verseText}`,
    ``,
    `Word data:`,
    `- Gloss: ${row.gloss}`,
    `- Grammar: ${row.grammar_prefix}`,
    `- POS: ${row.pos_category}`,
    `- Strong's: ${row.strongs_code}`,
    `- BDB definition: ${row.word_gloss || '(none)'}`,
    `- Etymology type: ${row.etymology_type || '(none)'}`,
  ];

  if (row.root_code) {
    lines.push(`- Root: ${row.root_heb_consonant} (${row.root_sbl_transliteration || '?'}) — "${row.root_gloss || '?'}"`);
    lines.push(`- Root code: ${row.root_code}`);
  }

  // Prefixes
  for (let n = 1; n <= 3; n++) {
    const sc = row[`prefix_${n}_strongs_code`];
    if (sc) {
      lines.push(`- Prefix ${n}: ${row[`prefix_${n}_heb_consonant`]} (${row[`prefix_${n}_sbl_transliteration`]}) = "${row[`prefix_${n}_gloss`]}"`);
    }
  }

  // Suffixes
  for (let n = 1; n <= 3; n++) {
    const sc = row[`suffix_${n}_strongs_code`];
    if (sc) {
      lines.push(`- Suffix ${n}: ${row[`suffix_${n}_heb_consonant`]} (${row[`suffix_${n}_sbl_transliteration`]}) = "${row[`suffix_${n}_gloss`]}"`);
    }
  }

  lines.push(`- Word position: #${row.word_order} (stage ${row.stage_index})`);
  lines.push(`- Prior occurrences of this root in learner's journey: ${priorRootCount}`);

  return lines.join('\n');
}

async function callDeepSeek(userMessage) {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error [${res.status}]: ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error('  ⚠️  Raw DeepSeek response:', JSON.stringify(json, null, 2).slice(0, 800));
    throw new Error('DeepSeek returned empty content');
  }
  return content;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  assertEnv();

  const startTime = Date.now();
  console.log('━'.repeat(60));
  console.log('📖 fill-deep-explanations.mjs — Contextual Word Meaning');
  console.log(`   BOOK=${BOOK_FILTER}  MAX_ROWS=${MAX_ROWS}  RATE_LIMIT_MS=${RATE_LIMIT_MS}`);
  console.log('━'.repeat(60));

  // 0. Ensure contextual_meaning column exists (idempotent)
  console.log('\n🔧 Ensuring contextual_meaning column exists...');
  try {
    await d1Query(`ALTER TABLE contextual_word_meaning ADD COLUMN contextual_meaning TEXT`);
    console.log('   ✅ Column created.');
  } catch (e) {
    // Column already exists — that's fine
    console.log('   ✅ Column already exists.');
  }

  // 1. Fetch pending rows (non-particle, NULL contextual_meaning)
  console.log(`\n⏳ Fetching up to ${MAX_ROWS} rows (book=${BOOK_FILTER}, is_particle=0, contextual_meaning IS NULL)...`);
  const rows = await fetchPendingRows(MAX_ROWS);

  if (rows.length === 0) {
    console.log('✅ No pending rows found. All non-particle words have explanations.');
    return;
  }
  console.log(`   Found ${rows.length} rows to process.\n`);

  // 2. POS distribution
  const posCounts = rows.reduce((acc, r) => {
    acc[r.pos_category] = (acc[r.pos_category] ?? 0) + 1;
    return acc;
  }, {});
  console.log('   POS distribution:', JSON.stringify(posCounts));
  console.log('');

  // 3. Process each row
  let successCount = 0;
  let errorCount   = 0;

  // Cache verse lookups to avoid redundant queries
  const verseCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const idx = `[${String(i + 1).padStart(String(rows.length).length)}/${rows.length}]`;

    try {
      // Build verse context
      const verseKey = `${row.book}.${row.chapter}.${row.verse}`;
      if (!verseCache.has(verseKey)) {
        verseCache.set(verseKey, await fetchVerseWords(row.book, row.chapter, row.verse));
      }
      const verseWords = verseCache.get(verseKey);
      const verseText = verseWords
        .map(w => w.word_order === row.word_order ? `【${w.heb_nikud}】` : w.heb_nikud)
        .join(' ');

      // Count prior root occurrences
      const priorRootCount = await countPriorRootOccurrences(row.root_code, row.word_order);

      // Build message and call DeepSeek
      const userMessage = buildUserMessage(row, verseText, priorRootCount);
      const explanation = await callDeepSeek(userMessage);

      // Write back to D1
      await updateExplanation(row.book, row.chapter, row.verse, row.word_order, explanation);

      successCount++;
      console.log(`${idx} ✅  #${row.word_order} ${row.heb_nikud} (${row.pos_category})`);
      console.log(explanation.split('\n').map(l => `        ${l}`).join('\n'));
    } catch (err) {
      errorCount++;
      console.error(`${idx} ❌  #${row.word_order} ${row.heb_nikud} — ${err.message}`);
    }

    // Rate-limit
    if (i < rows.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // 4. Summary
  const elapsed = Date.now() - startTime;
  console.log('\n' + '━'.repeat(60));
  console.log(`✅ Done in ${formatTime(elapsed)}`);
  console.log(`   Success: ${successCount}  |  Errors: ${errorCount}  |  Total: ${rows.length}`);

  if (errorCount > 0) {
    console.log(`\n⚠️  ${errorCount} row(s) failed. They will be retried on the next run.`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
