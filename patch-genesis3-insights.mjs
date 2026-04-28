// patch-genesis3-insights.mjs
// One-time patch: unwraps stringified array insights in genesis-3.json
// produced by the old insight parser fallback bug.

import fs from 'fs';

const path = './src/data/verses/genesis-3.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

let fixed = 0;

function unwrapInsight(ins, verseNum, idx) {
  if (typeof ins !== 'string') return ins;
  const trimmed = ins.trim();
  if (!trimmed.startsWith('[')) return ins; // looks fine

  // Attempt 1: valid JSON array
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      console.log(`  [verse ${verseNum}] insight[${idx}] — JSON.parse unwrap`);
      fixed++;
      return parsed[0];
    }
  } catch { /* fall through */ }

  // Attempt 2: regex extract inner string from ["..."]
  const match = trimmed.match(/^\["([\s\S]+)"\]$/);
  if (match) {
    const inner = match[1].replace(/\\"/g, '"').trim();
    console.log(`  [verse ${verseNum}] insight[${idx}] — regex unwrap`);
    fixed++;
    return inner;
  }

  // Attempt 3: strip leading [" and trailing "]
  let stripped = trimmed;
  if (stripped.startsWith('["')) stripped = stripped.slice(2);
  if (stripped.endsWith('"]')) stripped = stripped.slice(0, -2);
  stripped = stripped.replace(/\\"/g, '"').trim();
  console.log(`  [verse ${verseNum}] insight[${idx}] — manual strip`);
  fixed++;
  return stripped;
}

for (const verse of data.verses) {
  if (!Array.isArray(verse.insights)) continue;
  verse.insights = verse.insights.map((ins, i) => unwrapInsight(ins, verse.verse, i));
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n✓ Patched ${fixed} insight(s) in genesis-3.json`);
