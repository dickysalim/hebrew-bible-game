/**
 * Transform ESV data: chop up the `esv` string into a segmented array
 * where each segment is tagged with the Hebrew word index it maps to.
 *
 * New format:
 *   "esv": [
 *     { "t": "And ", "w": null },
 *     { "t": "God", "w": 1 },
 *     ...
 *   ]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Find all occurrences of `phrase` in `text` (case-insensitive).
 * Returns array of { start, end } objects.
 */
function findAllOccurrences(text, phrase) {
  const results = []
  const lowerText = text.toLowerCase()
  const lowerPhrase = phrase.toLowerCase()
  let from = 0
  while (true) {
    const idx = lowerText.indexOf(lowerPhrase, from)
    if (idx === -1) break
    results.push({ start: idx, end: idx + phrase.length })
    from = idx + 1
  }
  return results
}

/**
 * Check if two ranges overlap.
 */
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end
}

/**
 * Assign each word (with non-null esvH) to a specific position in the ESV text.
 * Uses backtracking to find a valid non-overlapping assignment.
 */
function assignPositions(esvString, words) {
  // Build list of words that need assignment
  const toAssign = []
  for (let i = 0; i < words.length; i++) {
    const phrase = words[i].esvH
    if (!phrase) continue
    const positions = findAllOccurrences(esvString, phrase)
    if (positions.length === 0) {
      console.warn(`    ⚠ No match found for word ${i} ("${phrase}")`)
      continue
    }
    toAssign.push({ wordIndex: i, phrase, positions })
  }

  // Sort by number of positions (most constrained first) for efficiency
  // But keep original order as tiebreaker to prefer natural ordering
  const sorted = [...toAssign].sort((a, b) => {
    if (a.positions.length !== b.positions.length) return a.positions.length - b.positions.length
    return a.wordIndex - b.wordIndex
  })

  // Backtracking assignment
  const assignment = new Map() // wordIndex -> { start, end }

  function backtrack(idx) {
    if (idx >= sorted.length) return true

    const item = sorted[idx]
    for (const pos of item.positions) {
      // Check if this position overlaps with any already-assigned
      let hasOverlap = false
      for (const [, assigned] of assignment) {
        if (overlaps(pos, assigned)) {
          hasOverlap = true
          break
        }
      }
      if (hasOverlap) continue

      assignment.set(item.wordIndex, pos)
      if (backtrack(idx + 1)) return true
      assignment.delete(item.wordIndex)
    }
    return false
  }

  if (!backtrack(0)) {
    // Partial assignment fallback - try greedy
    console.warn(`    ⚠ Backtracking failed, using greedy fallback`)
    assignment.clear()
    for (const item of toAssign) {
      for (const pos of item.positions) {
        let hasOverlap = false
        for (const [, assigned] of assignment) {
          if (overlaps(pos, assigned)) { hasOverlap = true; break }
        }
        if (!hasOverlap) {
          assignment.set(item.wordIndex, pos)
          break
        }
      }
    }
  }

  return assignment
}

function segmentESV(esvString, words) {
  if (!esvString || !words || words.length === 0) {
    return [{ t: esvString || '', w: null }]
  }

  const assignment = assignPositions(esvString, words)

  if (assignment.size === 0) {
    return [{ t: esvString, w: null }]
  }

  // Sort by position
  const sorted = [...assignment.entries()]
    .map(([wordIndex, pos]) => ({ wordIndex, start: pos.start, end: pos.end }))
    .sort((a, b) => a.start - b.start)

  // Build segments
  const segments = []
  let cursor = 0

  for (const { wordIndex, start, end } of sorted) {
    if (start > cursor) {
      segments.push({ t: esvString.slice(cursor, start), w: null })
    }
    segments.push({ t: esvString.slice(start, end), w: wordIndex })
    cursor = end
  }

  if (cursor < esvString.length) {
    segments.push({ t: esvString.slice(cursor), w: null })
  }

  return segments
}

function transformFile(filePath) {
  console.log(`\nProcessing: ${filePath}`)
  const raw = readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)

  let issues = 0

  for (const verse of data.verses) {
    const esvString = verse.esv
    if (typeof esvString !== 'string') {
      console.log(`  Verse ${verse.verse}: already transformed, skipping`)
      continue
    }

    console.log(`  Verse ${verse.verse}:`)
    const segments = segmentESV(esvString, verse.words)

    // Verify reconstruction
    const reconstructed = segments.map(s => s.t).join('')
    if (reconstructed !== esvString) {
      console.error(`    ❌ RECONSTRUCTION MISMATCH!`)
      console.error(`    Original:      "${esvString}"`)
      console.error(`    Reconstructed: "${reconstructed}"`)
      issues++
      continue
    }

    const mappedCount = segments.filter(s => s.w !== null).length
    const totalNonNull = verse.words.filter(w => w.esvH).length
    const status = mappedCount === totalNonNull ? '✅' : '⚠️'
    console.log(`    ${status} ${mappedCount}/${totalNonNull} words mapped`)

    // Replace esv string with segments array
    verse.esv = segments
  }

  if (issues === 0) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`  ✅ File written successfully`)
  } else {
    console.error(`  ❌ ${issues} issues found, NOT writing file`)
  }

  return issues
}

// Transform both files
const versesDir = resolve(__dirname, '../src/data/verses')
const i1 = transformFile(resolve(versesDir, 'genesis-1.json'))
const i2 = transformFile(resolve(versesDir, 'genesis-2.json'))

if (i1 + i2 === 0) {
  console.log('\n🎉 All files transformed successfully!')
} else {
  console.log(`\n⚠ ${i1 + i2} total issues — check output above`)
}
