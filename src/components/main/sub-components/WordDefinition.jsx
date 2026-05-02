import './WordDefinition.css'

/**
 * WordDefinition — WIP placeholder.
 * Data layer is migrating from local JSON to Cloudflare D1.
 * Full implementation will resume once the D1 fetch layer is wired up.
 */
export default function WordDefinition({ noWrapper = false }) {
  const content = (
    <div className="wip-panel">
      <div className="wip-panel__icon">🚧</div>
      <p className="wip-panel__title">Word Definition</p>
      <p className="wip-panel__desc">Coming soon — migrating to Cloudflare D1</p>
    </div>
  )

  if (noWrapper) return content

  return <div className="word-definition">{content}</div>
}
