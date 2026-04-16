import wordsData from '../../../data/words.json'

/**
 * RootDetail — full-screen detail view for a Hebrew root.
 *
 * Layout (flat, no separate boxed panels):
 *  ← Lexicon           [back button]
 *  ─────────────────────────────────
 *  [ROOT HEBREW]  right-aligned
 *  [sbl]          right-aligned, directly under the Hebrew
 *  [gloss]
 *  [H####]
 *  ───────────────────────────────── (divider)
 *  BDB DEFINITION
 *  <bdb text>
 *
 *  EXPLANATION
 *  <para> <para>
 *
 *  WORDS CONNECTED TO THIS ROOT
 *  | Hebrew | SBL | Pos | Gloss |
 *
 * Props:
 *   root    { id, sbl, gloss, strongs, bdb, explanation }
 *   onBack  () => void
 */
export default function RootDetail({ root, onBack }) {
  if (!root) return null

  // All word entries in words.json whose root field matches this root's id
  const connectedWords = Object.entries(wordsData.words)
    .filter(([, data]) => data.root === root.id)
    .map(([wordKey, data]) => ({
      hebrew: wordKey,
      sbl: data.root_sbl ?? data.sbl ?? '—',
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

        {/* ── Root identity (right-aligned, Hebrew on top of SBL) ── */}
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

        {/* ── Connected words table ── */}
        <p className="root-detail__section-label" style={{ marginTop: '28px' }}>
          Words Connected to This Root
        </p>

        {connectedWords.length === 0 ? (
          <p className="root-detail__empty-words">No words on record for this root.</p>
        ) : (
          <div className="root-detail__words-table-wrap">
            <table className="root-detail__words-table">
              <thead>
                <tr>
                  <th>Hebrew</th>
                  <th>SBL</th>
                  <th>Pos</th>
                  <th>Gloss</th>
                </tr>
              </thead>
              <tbody>
                {connectedWords.map((row, i) => (
                  <tr key={i}>
                    <td className="root-detail__words-table__hebrew" dir="rtl" lang="he">
                      {row.hebrew}
                    </td>
                    <td className="root-detail__words-table__sbl">{row.sbl}</td>
                    <td className="root-detail__words-table__pos">{row.pos}</td>
                    <td>{row.gloss}</td>
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
