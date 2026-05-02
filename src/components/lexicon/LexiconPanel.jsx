/**
 * LexiconPanel — WIP placeholder.
 * Lexicon data is migrating from local JSON to Cloudflare D1.
 * The full root-card grid, search, and detail views will return
 * once the D1 fetch layer is wired up.
 */
export default function LexiconPanel() {
  return (
    <div className="lexicon-panel lexicon-panel--wip">
      <div className="lexicon-wip">
        <div className="lexicon-wip__icon">🔤</div>
        <h1 className="lexicon-wip__title">Lexicon</h1>
        <p className="lexicon-wip__subtitle">Work in progress</p>
        <p className="lexicon-wip__desc">
          The lexicon is migrating to Cloudflare D1.<br />
          Root cards, search &amp; concordance will return soon.
        </p>
      </div>
    </div>
  )
}
