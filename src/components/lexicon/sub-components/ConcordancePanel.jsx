import { useMemo } from 'react'
import genesis1 from '../../../data/verses/genesis-1.json'
import genesis2 from '../../../data/verses/genesis-2.json'
import wordsData from '../../../data/words.json'
import { loadProgressFromStorage } from '../../../utils/useProgressPersistence'

/**
 * All verse sources in canonical order.
 * Each entry tracks which chapter offset to use for progress lookup.
 * NOTE: Genesis 1 uses verse indices 0–30 in typedCounts.
 *       Genesis 2 is loaded separately and tracked independently.
 *       Both share the same typedCounts key format: `${verseIdx}-${wordIdx}`
 *       but the verseIdx resets per file in the current game implementation.
 *       For now, only Genesis 1 has progress tracking wired up.
 */
const VERSE_SOURCES = [
  { book: 'Genesis', chapter: 1, verses: genesis1.verses, progressKey: 'genesis-1' },
  { book: 'Genesis', chapter: 2, verses: genesis2.verses, progressKey: 'genesis-2' },
]

/**
 * Checks if a verse is completed given typedCounts.
 * celebratedVerses stores completed verse indices for the active chapter (genesis-1).
 */
function isVerseCompleted(verseIdx, progressKey, celebratedVerses) {
  if (progressKey === 'genesis-1') {
    return Array.isArray(celebratedVerses) && celebratedVerses.includes(verseIdx)
  }
  return false // Genesis 2 not yet playable
}

/**
 * Splits text into highlighted/plain segments around a target phrase.
 * Returns [{text, highlight}, ...]
 */
function buildESVSegments(fullText, phrases) {
  if (!fullText) return []
  let segments = [{ text: fullText, highlight: false }]
  for (const phrase of phrases) {
    if (!phrase) continue
    const next = []
    for (const seg of segments) {
      if (seg.highlight) { next.push(seg); continue }
      const idx = seg.text.indexOf(phrase)
      if (idx === -1) { next.push(seg); continue }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx), highlight: false })
      next.push({ text: phrase, highlight: true })
      const rest = seg.text.slice(idx + phrase.length)
      if (rest) next.push({ text: rest, highlight: false })
    }
    segments = next
  }
  return segments
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ConcordancePanel({ wordKey, onBack }) {
  const wordData = wordsData.words[wordKey]

  // Load progress from localStorage (synchronous read)
  const { celebratedVerses = [] } = useMemo(() => loadProgressFromStorage(), [])

  // Find all verse occurrences of this word across all sources
  const concordance = useMemo(() => {
    const results = []
    for (const { book, chapter, verses, progressKey } of VERSE_SOURCES) {
      for (let vi = 0; vi < verses.length; vi++) {
        const verse = verses[vi]
        const matchIndices = verse.words.reduce((acc, w, wi) => {
          if (w.id === wordKey) acc.push(wi)
          return acc
        }, [])
        if (matchIndices.length === 0) continue

        results.push({
          book,
          chapter,
          verseNum: verse.verse,
          verse,
          matchIndices,
          completed: isVerseCompleted(vi, progressKey, celebratedVerses),
        })
      }
    }
    return results
  }, [wordKey, celebratedVerses])

  const totalOccurrences = concordance.length
  const completedCount = concordance.filter(c => c.completed).length
  const isFullyCovered = completedCount === totalOccurrences && totalOccurrences > 0

  return (
    <div className="concordance-panel">
      {/* ── Back ── */}
      <button className="concordance__back" onClick={onBack} aria-label="Back to root detail">
        <span className="concordance__back-arrow">←</span>
        <span>Back</span>
      </button>

      <div className="concordance__body">
        {/* ── Word header ── */}
        <div className="concordance__word-header">
          <div className="concordance__word-hebrew" dir="rtl" lang="he">{wordKey}</div>
          <div className="concordance__word-meta">
            <span className="concordance__word-sbl">{wordData?.word_sbl ?? '—'}</span>
            <span className="concordance__word-dot">·</span>
            <span className="concordance__word-pos">{wordData?.pos ?? '—'}</span>
          </div>
          <div className="concordance__word-gloss">{wordData?.gloss ?? '—'}</div>
        </div>

        {/* ── Explanation ── */}
        {wordData?.explanation && (
          <div className="concordance__explanation">
            {wordData.explanation.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        <div className="concordance__divider" />

        {/* ── Progress status ── */}
        <div className={`concordance__status ${isFullyCovered ? 'concordance__status--complete' : ''}`}>
          {isFullyCovered ? (
            <>
              <span className="concordance__status-icon">✓</span>
              <span>All {totalOccurrences} occurrence{totalOccurrences !== 1 ? 's' : ''} found — concordance complete</span>
            </>
          ) : (
            <>
              <span className="concordance__status-icon">◎</span>
              <span>
                {completedCount} of {totalOccurrences} occurrence{totalOccurrences !== 1 ? 's' : ''} discovered
                {totalOccurrences - completedCount > 0 && (
                  <> — complete {totalOccurrences - completedCount} more verse{totalOccurrences - completedCount !== 1 ? 's' : ''} to unlock</>
                )}
              </span>
            </>
          )}
        </div>

        {/* ── Verse entries (completed only) ── */}
        <div className="concordance__verse-list">
          {concordance
            .filter(c => c.completed)
            .map((entry, i) => (
              <VerseEntry key={i} entry={entry} wordKey={wordKey} />
            ))}

          {/* Locked placeholder rows */}
          {concordance
            .filter(c => !c.completed)
            .map((entry, i) => (
              <div key={`locked-${i}`} className="concordance__verse-entry concordance__verse-entry--locked">
                <span className="concordance__lock-icon">🔒</span>
                <span className="concordance__lock-ref">
                  {entry.book} {entry.chapter}:{entry.verseNum} — complete this verse to unlock
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ─── Verse Entry ─────────────────────────────────────────────────────────────

function VerseEntry({ entry, wordKey }) {
  const { book, chapter, verseNum, verse, matchIndices } = entry
  const matchedEsvPhrases = matchIndices
    .map(wi => verse.words[wi]?.esvH)
    .filter(Boolean)
  const esvSegments = buildESVSegments(verse.esv, matchedEsvPhrases)

  return (
    <div className="concordance__verse-entry">
      {/* Reference */}
      <div className="concordance__verse-ref">
        {book} {chapter}:{verseNum}
      </div>

      {/* Hebrew line */}
      <div className="concordance__line concordance__line--hebrew" dir="rtl" lang="he">
        {verse.words.map((w, wi) => {
          const isMatch = matchIndices.includes(wi)
          return (
            <span
              key={wi}
              className={`concordance__word-token ${isMatch ? 'concordance__word-token--match' : ''}`}
            >
              {w.id}
            </span>
          )
        })}
      </div>

      {/* SBL line */}
      <div className="concordance__line concordance__line--sbl">
        {verse.words.map((w, wi) => {
          const isMatch = matchIndices.includes(wi)
          return (
            <span
              key={wi}
              className={`concordance__word-token ${isMatch ? 'concordance__word-token--match concordance__word-token--match-sbl' : ''}`}
            >
              {w.sbl ?? w.id}
            </span>
          )
        })}
      </div>

      {/* ESV line */}
      <div className="concordance__line concordance__line--esv">
        {esvSegments.map((seg, i) =>
          seg.highlight
            ? <mark key={i} className="concordance__esv-highlight">{seg.text}</mark>
            : <span key={i}>{seg.text}</span>
        )}
      </div>
    </div>
  )
}
