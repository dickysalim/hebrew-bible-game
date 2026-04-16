/**
 * RootDetail — full-screen view shown when the user taps a RootCard.
 *
 * Props:
 *   root    { id, sbl, gloss, strongs, bdb, explanation }
 *   onBack  () => void — called when the user presses the back button
 */
export default function RootDetail({ root, onBack }) {
  if (!root) return null

  return (
    <div className="root-detail">
      {/* ── Back button ── */}
      <button className="root-detail__back" onClick={onBack} aria-label="Back to lexicon">
        <span className="root-detail__back-arrow">←</span>
        <span>Lexicon</span>
      </button>

      {/* ── Scrollable body ── */}
      <div className="root-detail__body">
        {/* ── Card header ── */}
        <div className="root-detail__header">
          <div className="root-detail__hebrew" dir="rtl" lang="he">
            {root.id}
          </div>
          <div className="root-detail__sbl">{root.sbl}</div>
          <div className="root-detail__gloss">{root.gloss}</div>
          {root.strongs && (
            <div className="root-detail__strongs">{root.strongs}</div>
          )}
        </div>

        {/* ── BDB definition ── */}
        {root.bdb && (
          <section className="root-detail__section">
            <h2 className="root-detail__section-label">BDB Definition</h2>
            <p className="root-detail__bdb">{root.bdb}</p>
          </section>
        )}

        {/* ── Full explanation ── */}
        {root.explanation && (
          <section className="root-detail__section root-detail__section--explanation">
            <h2 className="root-detail__section-label">Explanation</h2>
            <div className="root-detail__explanation">
              {root.explanation.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
