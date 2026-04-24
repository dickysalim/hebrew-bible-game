import { useMemo } from 'react'
import genesis1 from '../../../data/verses/genesis-1.json'
import genesis2 from '../../../data/verses/genesis-2.json'
import wordsData from '../../../data/words.json'
import rootsData from '../../../data/roots.json'
import { loadProgressFromStorage } from '../../../utils/useProgressPersistence'
import { getEsvText } from '../../main/sub-components/ESVStrip'

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



// ─── Main Component ──────────────────────────────────────────────────────────

export default function ConcordancePanel({ wordKey, onBack }) {
  const wordData = wordsData.words[wordKey]
  const rootId   = wordData?.root ?? null
  const rootData = rootId ? rootsData.roots[rootId] : null

  const { celebratedVerses = [] } = useMemo(() => loadProgressFromStorage(), [])

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
          book, chapter,
          verseNum: verse.verse,
          verse, matchIndices,
          completed: isVerseCompleted(vi, progressKey, celebratedVerses),
        })
      }
    }
    return results
  }, [wordKey, celebratedVerses])

  const totalOccurrences = concordance.length
  const completedCount   = concordance.filter(c => c.completed).length
  const isFullyCovered   = completedCount === totalOccurrences && totalOccurrences > 0

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

          {/* ── Root chip — subtle, below gloss ── */}
          {rootData && (
            <div className="concordance__root-chip">
              <span className="concordance__root-label">root</span>
              <span className="concordance__root-hebrew" dir="rtl" lang="he">{rootId}</span>
              <span className="concordance__root-sbl">{rootData.sbl}</span>
              <span className="concordance__root-dot">·</span>
              <span className="concordance__root-gloss">{rootData.gloss}</span>
            </div>
          )}
        </div>

        {/* ── Explanation — fully visible ── */}
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

        {/* ── Verse entries ── */}
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

// ─── Verse Entry — compact, flowing design ───────────────────────────────────

function VerseEntry({ entry, wordKey }) {
  const { book, chapter, verseNum, verse, matchIndices } = entry

  // Build ESV segments with highlighting based on word index matching
  const esvSegments = Array.isArray(verse.esv)
    ? verse.esv.map(seg => ({
        text: seg.t,
        highlight: seg.w !== null && matchIndices.includes(seg.w),
      }))
    : [{ text: typeof verse.esv === 'string' ? verse.esv : getEsvText(verse.esv), highlight: false }]

  return (
    <div className="concordance__verse-entry">
      {/* Reference badge inline */}
      <span className="concordance__verse-ref">{book} {chapter}:{verseNum}</span>

      {/* Hebrew + SBL on one flowing line each */}
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
