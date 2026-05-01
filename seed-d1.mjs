// seed-d1.mjs
// One-time script: reads words.json + roots.json and seeds Cloudflare D1.
// Runs in batches of 50 to stay within D1 statement limits.
//
// Usage:
//   Local dev:   node seed-d1.mjs --local
//   Production:  node seed-d1.mjs --remote

import fs from 'fs'
import { execSync } from 'child_process'

const isRemote = process.argv.includes('--remote')
const flag = isRemote ? '--remote' : '--local'
const DB = 'hebrew-lexicon'

console.log(`\n🌱 Seeding D1 (${isRemote ? 'REMOTE ☁️' : 'LOCAL 💻'})\n`)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escape(str) {
  if (str == null) return 'NULL'
  return `'${String(str).replace(/'/g, "''")}'`
}

function runSQL(sql) {
  // Write to temp file to avoid shell escaping issues with Hebrew characters
  const tmpFile = './seed-tmp.sql'
  fs.writeFileSync(tmpFile, sql, 'utf8')
  try {
    execSync(`npx wrangler d1 execute ${DB} ${flag} --file=${tmpFile}`, {
      stdio: 'pipe',
    })
  } finally {
    fs.unlinkSync(tmpFile)
  }
}

function seedInBatches(statements, label) {
  const BATCH = 50
  const total = statements.length
  let done = 0

  for (let i = 0; i < total; i += BATCH) {
    const chunk = statements.slice(i, i + BATCH)
    runSQL(chunk.join(';\n') + ';')
    done += chunk.length
    process.stdout.write(`  ${label}: ${done}/${total}\r`)
  }
  console.log(`  ✅ ${label}: ${total} rows inserted`)
}

// ---------------------------------------------------------------------------
// Seed words
// ---------------------------------------------------------------------------

const wordsData = JSON.parse(fs.readFileSync('./src/data/words.json', 'utf8'))
const wordEntries = Object.entries(wordsData.words)

console.log(`📖 Words: ${wordEntries.length} entries`)

const wordStatements = wordEntries.map(([hebrew, w]) => {
  const segments = w.segments ? JSON.stringify(w.segments) : null
  return `INSERT OR REPLACE INTO words
    (hebrew, word_sbl, gloss, root, pos, prefix_sbl, prefix_gloss,
     root_sbl, root_gloss, suffix_sbl, suffix_gloss, segments, explanation)
  VALUES (
    ${escape(hebrew)},
    ${escape(w.word_sbl)},
    ${escape(w.gloss)},
    ${escape(w.root)},
    ${escape(w.pos)},
    ${escape(w.prefix_sbl)},
    ${escape(w.prefix_gloss)},
    ${escape(w.root_sbl)},
    ${escape(w.root_gloss)},
    ${escape(w.suffix_sbl)},
    ${escape(w.suffix_gloss)},
    ${escape(segments)},
    ${escape(w.explanation)}
  )`
})

seedInBatches(wordStatements, 'words')

// ---------------------------------------------------------------------------
// Seed roots
// ---------------------------------------------------------------------------

const rootsData = JSON.parse(fs.readFileSync('./src/data/roots.json', 'utf8'))
const rootEntries = Object.entries(rootsData.roots)

console.log(`\n🌿 Roots: ${rootEntries.length} entries`)

const rootStatements = rootEntries.map(([strongs, r]) => {
  // Try to extract Hebrew consonants from the entry if available
  // Some entries have a 'hebrew' field, otherwise derive from the key
  const hebrew = r.hebrew || null

  return `INSERT OR REPLACE INTO roots
    (strongs, hebrew, sbl, gloss, bdb, explanation)
  VALUES (
    ${escape(strongs)},
    ${escape(hebrew)},
    ${escape(r.sbl)},
    ${escape(r.gloss)},
    ${escape(r.bdb)},
    ${escape(r.explanation)}
  )`
})

seedInBatches(rootStatements, 'roots')

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log(`\n✅ Seed complete!`)
console.log(`   Words: ${wordEntries.length} rows`)
console.log(`   Roots: ${rootEntries.length} rows`)
if (!isRemote) {
  console.log(`\n💡 Local seed done. To push to production:`)
  console.log(`   node seed-d1.mjs --remote`)
}
