import { useMemo } from 'react'
import genesis1 from '../../../data/verses/genesis-1.json'
import genesis2 from '../../../data/verses/genesis-2.json'
import { loadProgressFromStorage } from '../../../utils/useProgressPersistence'
import { getEsvText } from './ESVStrip'

const VERSE_SOURCES = [
  { book: 'Genesis', chapter: 1, verses: genesis1.verses, progressKey: 'genesis-1' },
  { book: 'Genesis', chapter: 2, verses: genesis2.verses, progressKey: 'genesis-2' },
]

function isVerseCompleted(verseIdx, progressKey, celebratedVerses) {
  if (progressKey === 'genesis-1') {
    return Array.isArray(celebratedVerses) && celebratedVerses.includes(verseIdx)
  }
  return false
}

/**
 * WordConcordanceTab — mini concordance for the game's word definition area.
 *
 * Lists all occurrences of the active word across all loaded chapters.
 * Only discovered (completed) verses are shown in full; undiscovered show a locked row.
 *
 * Props:
 *   wordId  string  — current word key to look up
 */
export default function WordConcordanceTab({ wordId }) {
  const { celebratedVerses = [] } = useMemo(() => loadProgressFromStorage(), [])

  const concordance = useMemo(() => {
    if (!wordId) return []
    const results = []
    for (const { book, chapter, verses, progressKey } of VERSE_SOURCES) {
      for (let vi = 0; vi < verses.length; vi++) {
        const verse = verses[vi]
        const matchIndices = verse.words.reduce((acc, w, wi) => {
          if (w.id === wordId) acc.push(wi)
          return acc
        }, [])
        if (matchIndices.length === 0) continue
        results.push({
          book, chapter,
          verseNum: verse.verse,
          verse, matchIndices,
          completed: isVerseCompleted(vi, progressKey, celebratedVerses),
        })
      }
    }
    return results
  }, [wordId, celebratedVerses])

  const totalOccurrences = concordance.length
  const completedCount   = concordance.filter(c => c.completed).length
  const isFullyCovered   = completedCount === totalOccurrences && totalOccurrences > 0

  if (!wordId) {
    return (
      <div className="wdt-conc-empty">
        <span className="wdt-conc-empty__icon">📖</span>
        <p>Complete a word to see its concordance.</p>
      </div>
    )
  }

  return (
    <div className="wdt-conc">
      {/* Progress status */}
      <div className={`wdt-conc__status ${isFullyCovered ? 'wdt-conc__status--complete' : ''}`}>
        {isFullyCovered ? (
          <>
            <span className="wdt-conc__status-icon">✓</span>
            <span>All {totalOccurrences} occurrence{totalOccurrences !== 1 ? 's' : ''} found — concordance complete</span>
          </>
        ) : (
          <>
            <span className="wdt-conc__status-icon">◎</span>
            <span>
              {completedCount} of {totalOccurrences} occurrence{totalOccurrences !== 1 ? 's' : ''} discovered
              {totalOccurrences - completedCount > 0 && (
                <> — {totalOccurrences - completedCount} more verse{totalOccurrences - completedCount !== 1 ? 's' : ''} to unlock</>
              )}
            </span>
          </>
        )}
      </div>

      <div className="wdt-conc__divider" />

      {/* Verse entries */}
      <div className="wdt-conc__verse-list">
        {concordance
          .filter(c => c.completed)
          .map((entry, i) => (
            <VerseEntry key={i} entry={entry} wordId={wordId} />
          ))}

        {/* Locked placeholder rows */}
        {concordance
          .filter(c => !c.completed)
          .map((entry, i) => (
            <div key={`locked-${i}`} className="wdt-conc__verse-entry wdt-conc__verse-entry--locked">
              <span className="wdt-conc__lock-icon">🔒</span>
              <span className="wdt-conc__lock-ref">
                {entry.book} {entry.chapter}:{entry.verseNum} — complete this verse to unlock
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── Verse Entry ─────────────────────────────────────────────────────────────

function VerseEntry({ entry, wordId }) {
  const { book, chapter, verseNum, verse, matchIndices } = entry

  const esvSegments = Array.isArray(verse.esv)
    ? verse.esv.map(seg => ({
        text: seg.t,
        highlight: seg.w !== null && matchIndices.includes(seg.w),
      }))
    : [{ text: typeof verse.esv === 'string' ? verse.esv : getEsvText(verse.esv), highlight: false }]

  return (
    <div className="wdt-conc__verse-entry">
      <span className="wdt-conc__verse-ref">{book} {chapter}:{verseNum}</span>

      <div className="wdt-conc__line wdt-conc__line--hebrew" dir="rtl" lang="he">
        {verse.words.map((w, wi) => {
          const isMatch = matchIndices.includes(wi)
          return (
            <span
              key={wi}
              className={`wdt-conc__word-token ${isMatch ? 'wdt-conc__word-token--match' : ''}`}
            >
              {w.id}
            </span>
          )
        })}
      </div>

      <div className="wdt-conc__line wdt-conc__line--sbl">
        {verse.words.map((w, wi) => {
          const isMatch = matchIndices.includes(wi)
          return (
            <span
              key={wi}
              className={`wdt-conc__word-token ${isMatch ? 'wdt-conc__word-token--match wdt-conc__word-token--match-sbl' : ''}`}
            >
              {w.sbl ?? w.id}
            </span>
          )
        })}
      </div>

      <div className="wdt-conc__line wdt-conc__line--esv">
        {esvSegments.map((seg, i) =>
          seg.highlight
            ? <mark key={i} className="wdt-conc__esv-highlight">{seg.text}</mark>
            : <span key={i}>{seg.text}</span>
        )}
      </div>
    </div>
  )
}
