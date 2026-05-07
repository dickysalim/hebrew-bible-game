#!/usr/bin/env node
/**
 * fill-explanations.mjs
 *
 * Queries the hebrew-lexicon D1 database for rows with a NULL explanation,
 * calls DeepSeek to generate a scholarly lexical explanation for each row,
 * and writes the result back to D1 via the Cloudflare REST API.
 *
 * Environment variables (required):
 *   CLOUDFLARE_ACCOUNT_ID      – Cloudflare account ID
 *   CLOUDFLARE_D1_DATABASE_ID  – D1 database ID (uuid)
 *   CLOUDFLARE_API_TOKEN       – API token with D1 Edit permission
 *   DEEPSEEK_API_KEY           – DeepSeek API key
 *
 * Configuration (optional overrides via env):
 *   MAX_ROWS          – Maximum rows to process per run   (default: 500)
 *   RATE_LIMIT_MS     – Delay between DeepSeek calls (ms) (default: 500)
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const ACCOUNT_ID  = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_TOKEN    = process.env.CLOUDFLARE_API_TOKEN;
const DS_KEY      = process.env.DEEPSEEK_API_KEY;

const MAX_ROWS      = parseInt(process.env.MAX_ROWS     ?? '500', 10);
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS ?? '500', 10);
const TYPE_FILTER   = process.env.TYPE_FILTER ?? null; // e.g. 'inflected' — null = priority order

const DEEPSEEK_MODEL  = 'deepseek-v4-flash'; // non-reasoning model — outputs directly, no chain-of-thought
const DEEPSEEK_URL    = 'https://api.deepseek.com/chat/completions';
const CF_D1_BASE      = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

// Priority order: each type is filled before moving to the next
const TYPE_ORDER = ['particle', 'root', 'lemma', 'opaque', 'inflected'];

// ─── Validation ───────────────────────────────────────────────────────────────

function assertEnv() {
  const missing = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_API_TOKEN', 'DEEPSEEK_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── Cloudflare D1 REST helpers ───────────────────────────────────────────────

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

  // The API returns { result: [{ results: [...], ... }] }
  return json.result?.[0]?.results ?? [];
}

/**
 * Fetch up to `limit` rows with NULL explanation, ordered by type priority.
 */
async function fetchPendingRows(limit) {
  const typeOrder = TYPE_ORDER.map((t, i) => `WHEN '${t}' THEN ${i}`).join(' ');
  const typeClause = TYPE_FILTER ? `AND type = '${TYPE_FILTER}'` : '';
  const sql = `
    SELECT
      dstrongs_chain,
      type,
      language,
      aleph_bet,
      sbl_transliterations,
      glosses,
      pos,
      bdb,
      source_note
    FROM dstrongs_chains
    WHERE explanation IS NULL
    ${typeClause}
    ORDER BY CASE type ${typeOrder} ELSE ${TYPE_ORDER.length} END
    LIMIT ?
  `;
  return d1Query(sql, [limit]);
}

/**
 * Write the explanation for a single row back to D1.
 */
async function updateExplanation(dstrongsChain, explanation) {
  const sql = `UPDATE dstrongs_chains SET explanation = ? WHERE dstrongs_chain = ?`;
  await d1Query(sql, [explanation, dstrongsChain]);
}

// ─── DeepSeek helper ─────────────────────────────────────────────────────────

// System prompt: popup definitions for a Bible reading game.
// No pronunciation header, no root line — game UI already shows the word.
// Core word meaning is the lead; grammatical attachments are a side note.
const SYSTEM_PROMPT = `You generate popup definitions for a Bible reading game. The user clicks a Hebrew or Greek word while reading Scripture.

Format (two sections only):

What's happening: {explain what the CORE word means — its soul, imagery, usage. If a prefix/article/suffix is attached, mention it in ONE brief phrase at the end, never as the lead.}

One unique thing: {one memorable fact about this word}

Rules:
- No niqqud — consonants only if you write script
- Pronunciation — syllable-based, stress on CAPITALS (e.g. sha-MA-yim, not shamayim)
- No academic jargon — smooth language the reader absorbs in 3-5 seconds
- No markdown, no bullet symbols
- Do NOT open with a pronunciation line or a Root: line — the game UI shows that already
- The word's core meaning comes FIRST. Grammatical modifications (definite article, prefixes, suffixes, verb conjugation) are always a side note, never the main focus

Priority rule for inflected/prefixed/suffixed forms:
Explain the BASE word deeply. Then add one sentence like "Here it carries the definite article ha-, making it 'the heavens' specifically" or "Here it appears as a 3ms perfect form." That's it — one sentence, at the end.

Flexibility rule:
If a word is theologically loaded, culturally layered, or hard to pin down — go deeper. Add a "Why it matters:" line or more context. Depth is welcome when the word earns it.

Example — השמים (inflected form of shamayim):

What's happening: Shamayim means the heavens or sky — the vast dome above the earth, home of stars, rain, and the dwelling place of God. The word is always plural in Hebrew, as if the sky is too large for a singular. Here it carries the definite article ha-, meaning "the heavens" specifically.

One unique thing: Shamayim appears in the very first verse of the Bible — "In the beginning God created the heavens and the earth."

Example — נקבה (simple form):

What's happening: Hebrew names the female by her distinct physical form — the one with the opening. Rooted in נקב (to pierce, to bore), it is concrete, direct, and carries no shame.

One unique thing: This is the exact word Genesis 1:27 uses when God creates humanity "male and female."`;


/**
 * Build the user message for a single lexical row.
 * The system prompt handles all formatting rules; the user message supplies raw data.
 */
function buildUserMessage(row) {
  const lines = [
    `Generate a popup definition for this Hebrew/Greek lexical entry:`,
    ``,
    `Entry ID   : ${row.dstrongs_chain}`,
    `Type       : ${row.type}`,
    `Language   : ${row.language ?? 'Hebrew'}`,
    `Script     : ${row.aleph_bet ?? '(none)'}`,
    `SBL Trans. : ${row.sbl_transliterations ?? '(none)'}`,
    `Glosses    : ${row.glosses ?? '(none)'}`,
    `Part-of-sp.: ${row.pos ?? '(none)'}`,
    `BDB note   : ${row.bdb ?? '(none)'}`,
    `Source note: ${row.source_note ?? '(none)'}`,
  ];
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
      max_tokens: 10000, // generous headroom for V4 reasoning chain + complex entries
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error [${res.status}]: ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  // V4 reasoning models write chain-of-thought to reasoning_content, final answer to content.
  // If content is empty the reasoning budget was exhausted — fall back to reasoning_content.
  const content = json.choices?.[0]?.message?.content?.trim()
    || json.choices?.[0]?.message?.reasoning_content?.trim();
  if (!content) {
    console.error('  ⚠️  Raw DeepSeek response:', JSON.stringify(json, null, 2).slice(0, 800));
    throw new Error('DeepSeek returned empty content');
  }
  return content;
}

// ─── Rate limiter ────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Progress tracking ────────────────────────────────────────────────────────

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  assertEnv();

  const startTime = Date.now();
  console.log('━'.repeat(60));
  console.log('📖 fill-explanations.mjs — Hebrew Lexicon');
  console.log(`   MAX_ROWS=${MAX_ROWS}  RATE_LIMIT_MS=${RATE_LIMIT_MS}`);
  console.log('━'.repeat(60));

  // 1. Fetch rows
  console.log(`\n⏳ Fetching up to ${MAX_ROWS} rows with NULL explanation...`);
  const rows = await fetchPendingRows(MAX_ROWS);

  if (rows.length === 0) {
    console.log('✅ No rows with NULL explanation found. Nothing to do.');
    return;
  }
  console.log(`   Found ${rows.length} rows to process.\n`);

  // 2. Show type distribution for this batch
  const typeCounts = rows.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});
  console.log('   Type distribution:', JSON.stringify(typeCounts));
  console.log('');

  // 3. Process each row
  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const idx = `[${String(i + 1).padStart(String(rows.length).length)}/${rows.length}]`;

    try {
      const userMessage = buildUserMessage(row);
      const explanation = await callDeepSeek(userMessage);
      await updateExplanation(row.dstrongs_chain, explanation);

      successCount++;
      console.log(`${idx} ✅  ${row.dstrongs_chain}  (${row.type})`);
      // Print the full popup so we can review quality in CI logs
      console.log(explanation.split('\n').map(l => `        ${l}`).join('\n'));
    } catch (err) {
      errorCount++;
      console.error(`${idx} ❌  ${row.dstrongs_chain}  — ${err.message}`);
    }

    // Rate-limit: skip delay after the last item
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
