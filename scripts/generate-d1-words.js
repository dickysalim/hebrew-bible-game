#!/usr/bin/env node

/**
 * generate-d1-words.js
 *
 * Reads every word from src/data/verses/*.json files,
 * orders them by stage_index (verse processing order),
 * and outputs a flat word list for Cloudflare D1 insertion.
 *
 * Output:
 *   - scripts/output/d1-words.json   (JSON array)
 *   - scripts/output/d1-words.sql    (SQL INSERT statements)
 *
 * Usage:
 *   node scripts/generate-d1-words.js
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const VERSES_DIR = join(ROOT, 'src', 'data', 'verses');
const OUTPUT_DIR = join(__dirname, 'output');

async function loadAllChapters() {
  const files = await readdir(VERSES_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`📂 Found ${jsonFiles.length} verse files`);

  const chapters = [];

  for (const file of jsonFiles) {
    const raw = await readFile(join(VERSES_DIR, file), 'utf-8');
    const data = JSON.parse(raw);
    chapters.push({
      file,
      book: data.book,
      chapter: data.chapter,
      stage_index: data.stage_index,
      verses: data.verses,
    });
  }

  // Sort by stage_index — this is the canonical processing order
  chapters.sort((a, b) => a.stage_index - b.stage_index);

  console.log(`📖 Processing order: stage_index ${chapters[0].stage_index} (${chapters[0].book} ${chapters[0].chapter}) → ${chapters[chapters.length - 1].stage_index} (${chapters[chapters.length - 1].book} ${chapters[chapters.length - 1].chapter})`);

  return chapters;
}

function extractWords(chapters) {
  const words = [];
  let wordOrder = 0;

  for (const chapter of chapters) {
    // Within each chapter, verses are already ordered by their array position
    for (const verse of chapter.verses) {
      for (const word of verse.words) {
        wordOrder++;
        words.push({
          word_order: wordOrder,
          book: chapter.book,
          chapter: chapter.chapter,
          stage_index: chapter.stage_index,
          verse: verse.verse,
          aleph_bet: word.id,
          sbl: word.sbl,
          gloss: word.gloss,
        });
      }
    }
  }

  return words;
}

function escapeSql(str) {
  if (str == null) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function generateSql(words) {
  const lines = [];

  lines.push('-- Auto-generated D1 word table');
  lines.push('-- Generated at: ' + new Date().toISOString());
  lines.push(`-- Total words: ${words.length}`);
  lines.push('');
  lines.push('DROP TABLE IF EXISTS word_appearance_map;');
  lines.push('');
  lines.push(`CREATE TABLE word_appearance_map (
  word_order INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  stage_index INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  aleph_bet TEXT NOT NULL,
  sbl TEXT NOT NULL,
  gloss TEXT NOT NULL
);`);
  lines.push('');

  // Batch inserts (500 rows per statement for D1 compatibility)
  const BATCH_SIZE = 500;

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const values = batch.map(w =>
      `(${w.word_order}, ${escapeSql(w.book)}, ${w.chapter}, ${w.stage_index}, ${w.verse}, ${escapeSql(w.aleph_bet)}, ${escapeSql(w.sbl)}, ${escapeSql(w.gloss)})`
    );

    lines.push(`INSERT INTO word_appearance_map (word_order, book, chapter, stage_index, verse, aleph_bet, sbl, gloss) VALUES`);
    lines.push(values.join(',\n') + ';');
    lines.push('');
  }

  // Add useful indexes
  lines.push('CREATE INDEX idx_wam_book_chapter ON word_appearance_map (book, chapter);');
  lines.push('CREATE INDEX idx_wam_stage_index ON word_appearance_map (stage_index);');
  lines.push('CREATE INDEX idx_wam_aleph_bet ON word_appearance_map (aleph_bet);');

  return lines.join('\n');
}

async function main() {
  console.log('🔤 Hebrew Bible Word Extractor → D1 Format');
  console.log('═'.repeat(50));

  const chapters = await loadAllChapters();
  const words = extractWords(chapters);

  console.log(`✅ Extracted ${words.length.toLocaleString()} total words`);

  // Show first/last few words as sanity check
  console.log('\n📋 First 5 words:');
  for (const w of words.slice(0, 5)) {
    console.log(`  #${w.word_order} ${w.book} ${w.chapter}:${w.verse} — ${w.aleph_bet} (${w.sbl}) "${w.gloss}"`);
  }
  console.log('\n📋 Last 5 words:');
  for (const w of words.slice(-5)) {
    console.log(`  #${w.word_order} ${w.book} ${w.chapter}:${w.verse} — ${w.aleph_bet} (${w.sbl}) "${w.gloss}"`);
  }

  // Book stats
  const bookStats = {};
  for (const w of words) {
    bookStats[w.book] = (bookStats[w.book] || 0) + 1;
  }
  console.log(`\n📊 Words per book (${Object.keys(bookStats).length} books):`);
  // Show in stage_index order
  const bookOrder = [];
  const seen = new Set();
  for (const w of words) {
    if (!seen.has(w.book)) {
      seen.add(w.book);
      bookOrder.push(w.book);
    }
  }
  for (const book of bookOrder) {
    console.log(`  ${book}: ${bookStats[book].toLocaleString()} words`);
  }

  // Write outputs
  await mkdir(OUTPUT_DIR, { recursive: true });

  const jsonPath = join(OUTPUT_DIR, 'd1-words.json');
  await writeFile(jsonPath, JSON.stringify(words, null, 2), 'utf-8');
  console.log(`\n💾 JSON saved: ${jsonPath}`);

  const sqlPath = join(OUTPUT_DIR, 'd1-words.sql');
  const sql = generateSql(words);
  await writeFile(sqlPath, sql, 'utf-8');
  console.log(`💾 SQL saved: ${sqlPath}`);

  console.log('\n🎉 Done! Use the SQL file with wrangler:');
  console.log('   npx wrangler d1 execute <DB_NAME> --file=scripts/output/d1-words.sql');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
