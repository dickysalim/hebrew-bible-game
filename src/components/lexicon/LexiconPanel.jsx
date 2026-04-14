import { useEffect, useRef, useState } from 'react'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import rootsData from '../../data/roots.json'
import RootCard from './sub-components/RootCard'

// Total roots available in the data file
const TOTAL_ROOTS = Object.keys(rootsData.roots).length

export default function LexiconPanel() {
  const { discoveredRoots, newRoots, markRootsAsViewed } = useRootDiscovery()

  // Capture new roots ONCE at mount — frozen snapshot so animations
  // are not disrupted when markRootsAsViewed() clears the live newRoots array.
  const newRootsSnapshot = useRef(newRoots)
  const newRootIds = useRef(new Set(newRoots.map(r => r.id)))

  // Whether the highlight is still active (cleared when user leaves + returns)
  const [highlighted, setHighlighted] = useState(newRootIds.current.size > 0)

  // Mark roots as viewed in context (clears the badge) after animations start
  useEffect(() => {
    const t = setTimeout(() => markRootsAsViewed(), 800)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When the component unmounts (user leaves Lexicon), turn off highlight
  useEffect(() => {
    return () => {
      setHighlighted(false)
    }
  }, [])

  // Sort: new cards first (top-left), then the rest in discovery order
  const sortedRoots = [...discoveredRoots].sort((a, b) => {
    const aNew = newRootIds.current.has(a.id)
    const bNew = newRootIds.current.has(b.id)
    if (aNew && !bNew) return -1
    if (!aNew && bNew) return 1
    return 0
  })

  // Build pop-delay map from the FROZEN snapshot (not live newRoots)
  // so delays don't change when markRootsAsViewed() clears the context array.
  const popDelayFor = (rootId) => {
    const idx = newRootsSnapshot.current.findIndex(r => r.id === rootId)
    return idx >= 0 ? idx * 120 : 0
  }

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
            const isNew = newRootIds.current.has(root.id)
            return (
              <RootCard
                key={root.id}
                root={root}
                isNew={isNew}
                popDelay={isNew ? popDelayFor(root.id) : 0}
                highlighted={highlighted && isNew}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
