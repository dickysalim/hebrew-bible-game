import { useEffect, useState } from 'react'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import rootsData from '../../data/roots.json'
import RootCard from './sub-components/RootCard'

// Total roots available in the data file
const TOTAL_ROOTS = Object.keys(rootsData.roots).length

export default function LexiconPanel() {
  const { discoveredRoots, newRoots, markRootsAsViewed } = useRootDiscovery()

  // Snapshot which roots are "new" at mount time, before the badge is cleared.
  // Using lazy useState (not a ref) so the value is React-tracked and stable.
  const [sessionNewRoots] = useState(() => [...newRoots])

  // Clear the badge immediately on mount.
  // No cleanup needed: "new" status is entirely driven by the local snapshot above,
  // so remounting automatically resets it (next visit uses whatever newRoots contains then).
  useEffect(() => {
    markRootsAsViewed()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sort: new cards first (top-left), then the rest in discovery order
  const sortedRoots = [...discoveredRoots].sort((a, b) => {
    const aNew = sessionNewRoots.some(r => r.id === a.id)
    const bNew = sessionNewRoots.some(r => r.id === b.id)
    if (aNew && !bNew) return -1
    if (!aNew && bNew) return 1
    return 0
  })

  const hasCards = discoveredRoots.length > 0

  return (
    <div className="lexicon-panel">
      {/* ── Header ── */}
      <div className="lexicon-header">
        <h1 className="lexicon-title">Lexicon</h1>
        <p className="lexicon-subtitle">
          {hasCards
            ? `${discoveredRoots.length} of ${TOTAL_ROOTS} roots collected`
            : 'Discover Hebrew roots as you type'}
        </p>
      </div>

      {/* ── Empty state ── */}
      {!hasCards && (
        <div className="lexicon-empty">
          <div className="lexicon-empty__icon">📖</div>
          <p className="lexicon-empty__text">
            Complete words in the game to unlock root cards here.
          </p>
        </div>
      )}

      {/* ── Card grid ── */}
      {hasCards && (
        <div className="lexicon-grid">
          {sortedRoots.map((root) => {
            const newIdx = sessionNewRoots.findIndex(r => r.id === root.id)
            const isNew = newIdx >= 0
            return (
              <RootCard
                key={root.id}
                root={root}
                isNew={isNew}
                popDelay={isNew ? newIdx * 200 : 0}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
