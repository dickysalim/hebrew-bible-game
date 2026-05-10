/**
 * gen-chapter-registry.mjs
 * Reads all verse JSON files and prints the CHAPTER_REGISTRY array
 * and importChapterById switch cases for useChapterLoader.js
 */

import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const versesDir = join(__dirname, '../src/data/verses')

const files = (await readdir(versesDir)).filter(f => f.endsWith('.json'))

const chapters = []

for (const file of files) {
  const raw = await readFile(join(versesDir, file), 'utf8')
  const data = JSON.parse(raw)
  const id = file.replace('.json', '')
  // Capitalize first letter of each word for the book display name
  const bookDisplay = data.book
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  chapters.push({
    stageIndex: data.stage_index,
    id,
    book: bookDisplay,
    chapter: data.chapter,
    totalVerses: data.verses?.length ?? 0,
  })
}

// Sort by stageIndex
chapters.sort((a, b) => a.stageIndex - b.stageIndex)

// Print CHAPTER_REGISTRY
console.log('// ─── CHAPTER_REGISTRY ───────────────────────────────────────────────────────')
console.log('export const CHAPTER_REGISTRY = [')
for (const c of chapters) {
  console.log(`  { stageIndex: ${c.stageIndex}, id: '${c.id}', book: '${c.book}', chapter: ${c.chapter}, totalVerses: ${c.totalVerses} },`)
}
console.log(']')

console.log('')
console.log('// ─── importChapterById switch ────────────────────────────────────────────────')
console.log('async function importChapterById(chapterId) {')
console.log('  switch (chapterId) {')
for (const c of chapters) {
  console.log(`    case '${c.id}': return (await import('../data/verses/${c.id}.json')).default`)
}
console.log("    default: throw new Error(`Unknown chapter id: ${chapterId}`)")
console.log('  }')
console.log('}')
