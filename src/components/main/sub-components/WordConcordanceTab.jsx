import { useMemo } from 'react'
import genesis1 from '../../../data/verses/genesis-1.json'
import genesis2 from '../../../data/verses/genesis-2.json'
import { loadProgressFromStorage } from '../../../utils/useProgressPersistence'
import { useProgressCache } from '../../../contexts/ProgressCacheContext'
import { getEsvText } from './ESVStrip'

// stageIndex for each chapter source
const VERSE_SOURCES = [
  { book: 'Genesis', chapter: 1, verses: genesis1.verses, stageIndex: 1 },
  { book: 'Genesis', chapter: 2, verses: genesis2.verses, stageIndex: 2 },
]

/**
 * Build a map of { [stageIndex]: celebratedVerses[] } from a chapters object.
 */
function buildCelebratedMap(chapters = {}) {
  const map = {}
  for (const [si, ch] of Object.entries(chapters)) {
    map[Number(si)] = Array.isArray(ch.celebratedVerses) ? ch.celebratedVerses : []
  }
  return map
}

/**
 * Read the chapters map from the correct source:
 * - authenticated users: in-memory cachedProgress (sessionStorage/Supabase)
 * - anonymous users: localStorage via loadProgressFromStorage
 */
function useCelebratedMap() {
  const { cachedProgress } = useProgressCache()
  if (cachedProgress?.chapters) {
    return buildCelebratedMap(cachedProgress.chapters)
  }
  const { chapters = {} } = loadProgressFromStorage()
  return buildCelebratedMap(chapters)
}

function isVerseCompleted(verseIdx, stageIndex, celebratedMap) {
  const list = celebratedMap[stageIndex]
  return Array.isArray(list) && list.includes(verseIdx)
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
  // Reads from cachedProgress (auth users) or localStorage (anonymous).
  const celebratedMap = useCelebratedMap()
  // Serialize for stable useMemo dependency (avoids recompute on every render)
  const celebratedKey = JSON.stringify(celebratedMap)

  const concordance = useMemo(() => {
    if (!wordId) return []
    const results = []
    for (const { book, chapter, verses, stageIndex } of VERSE_SOURCES) {
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
          completed: isVerseCompleted(vi, stageIndex, celebratedMap),
        })
      }
    }
    return results
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId, celebratedKey])

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
