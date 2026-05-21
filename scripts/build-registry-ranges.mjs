/**
 * build-registry-ranges.mjs
 *
 * Scans all 928 verse JSON files and outputs a JSON mapping:
 *   { [stageIndex]: { firstWordOrder, lastWordOrder } }
 *
 * Usage:
 *   node scripts/build-registry-ranges.mjs
 *   → writes src/utils/wordOrderRanges.json
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

const VERSES_DIR = resolve('src/data/verses')
const OUTPUT = resolve('src/utils/wordOrderRanges.json')

const files = readdirSync(VERSES_DIR)
  .filter(f => f.endsWith('.json'))
  .sort()

const ranges = {}

for (const file of files) {
  const data = JSON.parse(readFileSync(join(VERSES_DIR, file), 'utf-8'))
  const si = data.stage_index
  if (si == null) {
    console.warn(`⚠ ${file} has no stage_index, skipping`)
    continue
  }

  let first = Infinity
  let last = -Infinity

  for (const verse of data.verses ?? []) {
    for (const word of verse.words ?? []) {
      if (word.word_order != null) {
        if (word.word_order < first) first = word.word_order
        if (word.word_order > last) last = word.word_order
      }
    }
  }

  if (first === Infinity || last === -Infinity) {
    console.warn(`⚠ ${file} (stage ${si}) has no word_order data`)
    continue
  }

  ranges[si] = { firstWordOrder: first, lastWordOrder: last }
}

writeFileSync(OUTPUT, JSON.stringify(ranges, null, 2) + '\n')
console.log(`✅ Wrote ${Object.keys(ranges).length} stage ranges to ${OUTPUT}`)

// Quick sanity check — stages should be contiguous and word_orders non-overlapping
const keys = Object.keys(ranges).map(Number).sort((a, b) => a - b)
let prevLast = 0
let ok = true
for (const si of keys) {
  const r = ranges[si]
  if (r.firstWordOrder !== prevLast + 1) {
    console.warn(`⚠ Gap: stage ${si} starts at ${r.firstWordOrder} but previous ended at ${prevLast}`)
    ok = false
  }
  if (r.lastWordOrder < r.firstWordOrder) {
    console.warn(`⚠ Invalid range for stage ${si}: ${r.firstWordOrder} → ${r.lastWordOrder}`)
    ok = false
  }
  prevLast = r.lastWordOrder
}
if (ok) console.log(`✅ All ${keys.length} stages have contiguous word_order ranges (1 → ${prevLast})`)
