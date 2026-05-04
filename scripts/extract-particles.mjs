// scripts/extract-particles.mjs
// Scans all verse JSONs, finds every unique prefix_strongs / suffix_strongs,
// and prints a table with example usage so we can write the gloss manually.

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const VERSES_DIR = './src/data/verses'

const particles = {} // { [strongs]: { type: 'prefix'|'suffix', examples: [{id, sbl, gloss}] } }

for (const file of readdirSync(VERSES_DIR)) {
  if (!file.endsWith('.json')) continue
  const data = JSON.parse(readFileSync(join(VERSES_DIR, file), 'utf8'))
  for (const verse of data.verses ?? []) {
    for (const word of verse.words ?? []) {
      for (const [field, type] of [['prefix_strongs', 'prefix'], ['suffix_strongs', 'suffix']]) {
        const s = word[field]
        if (!s) continue
        if (!particles[s]) particles[s] = { type, examples: [] }
        if (particles[s].examples.length < 3) {
          particles[s].examples.push({ id: word.id, sbl: word.sbl, gloss: word.gloss })
        }
      }
    }
  }
}

const sorted = Object.entries(particles).sort(([a], [b]) => {
  const na = parseInt(a.replace('H', ''))
  const nb = parseInt(b.replace('H', ''))
  return na - nb
})

console.log(`Found ${sorted.length} unique particle strongs:\n`)
for (const [strongs, info] of sorted) {
  const exampleStr = info.examples.map(e => `${e.sbl} (${e.gloss})`).join(' | ')
  console.log(`${strongs.padEnd(8)} [${info.type}]  ${exampleStr}`)
}

// Also write raw JSON for use in the next step
writeFileSync('./scripts/particles-found.json', JSON.stringify(
  Object.fromEntries(sorted.map(([s, info]) => [s, { type: info.type, examples: info.examples }])),
  null, 2
), 'utf8')
console.log('\nWrote scripts/particles-found.json')
