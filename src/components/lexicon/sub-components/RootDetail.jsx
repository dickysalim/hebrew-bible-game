import { useRootDiscovery } from '../../../contexts/RootDiscoveryContext'
import { getAllWords } from '../../../lib/lexiconCache'

export default function RootDetail({ root, onBack, onCheckConcordance }) {
  if (!root) return null

  const { discoveredWordsByRoot } = useRootDiscovery()

  // Words from D1 cache that belong to this root AND the user has discovered
  const discoveredWordKeys = new Set(
    (discoveredWordsByRoot[root.id] || []).map(w => w.word ?? w)
  )

  const wordRows = Object.entries(getAllWords())
    .filter(([wordKey, data]) =>
      data.root === root.id && discoveredWordKeys.has(wordKey)
    )
    .map(([wordKey, data]) => ({
      hebrew: wordKey,
      sbl: data.word_sbl ?? '—',
      pos: data.pos ?? '—',
      gloss: data.gloss ?? '—',
    }))

  return (
    <div className="root-detail">
      {/* ── Back button ── */}
      <button className="root-detail__back" onClick={onBack} aria-label="Back to lexicon">
        <span className="root-detail__back-arrow">←</span>
        <span>Lexicon</span>
      </button>

      {/* ── Scrollable body ── */}
      <div className="root-detail__body">

        {/* ── Root identity (right-aligned: Hebrew directly over SBL) ── */}
        <div className="root-detail__identity">
          <div className="root-detail__hebrew" dir="rtl" lang="he">{root.id}</div>
          <div className="root-detail__sbl">{root.sbl}</div>
          <div className="root-detail__gloss">{root.gloss}</div>
          {root.strongs && (
            <div className="root-detail__strongs">{root.strongs}</div>
          )}
        </div>

        <div className="root-detail__divider" />

        {/* ── BDB Definition ── */}
        {root.bdb && (
          <>
            <p className="root-detail__section-label">BDB Definition</p>
            <p className="root-detail__prose">{root.bdb}</p>
          </>
        )}

        {/* ── Explanation ── */}
        {root.explanation && (
          <>
            <p className="root-detail__section-label" style={{ marginTop: '20px' }}>Explanation</p>
            <div className="root-detail__prose-block">
              {root.explanation.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </>
        )}

        {/* ── Discovered words ── */}
        <p className="root-detail__section-label" style={{ marginTop: '28px' }}>
          Words You&apos;ve Discovered
        </p>

        {wordRows.length === 0 ? (
          <p className="root-detail__empty-words">
            No words discovered yet for this root. Keep playing!
          </p>
        ) : (
          <div className="root-detail__words-table-wrap">
            <table className="root-detail__words-table">
              <thead>
                <tr>
                  <th>Hebrew</th>
                  <th>SBL Word</th>
                  <th>Pos</th>
                  <th>Gloss</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wordRows.map((row, i) => (
                  <tr key={i}>
                    <td className="root-detail__words-table__hebrew" dir="rtl" lang="he">
                      {row.hebrew}
                    </td>
                    <td className="root-detail__words-table__sbl">{row.sbl}</td>
                    <td className="root-detail__words-table__pos">{row.pos}</td>
                    <td>{row.gloss}</td>
                    <td>
                      <button
                        className="concordance-btn"
                        onClick={() => onCheckConcordance?.(row.hebrew)}
                        aria-label={`Check concordance for ${row.hebrew}`}
                      >
                        Concordance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
