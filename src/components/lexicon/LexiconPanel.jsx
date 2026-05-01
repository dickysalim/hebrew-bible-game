import { useEffect, useState, useMemo } from 'react'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import { getAllRoots, getAllWords, getTotalRootsCount } from '../../lib/lexiconCache'
import RootCard from './sub-components/RootCard'
import RootDetail from './sub-components/RootDetail'
import ConcordancePanel from './sub-components/ConcordancePanel'
import SearchBar from './sub-components/SearchBar'
import { createSearchIndex, searchRoots } from '../../utils/searchUtils'

// Total roots available in D1
const TOTAL_ROOTS = getTotalRootsCount()

export default function LexiconPanel() {
  const { discoveredRoots, newRoots, markRootsAsViewed } = useRootDiscovery()

  // Snapshot which roots are "new" at mount time, before the badge is cleared.
  const [sessionNewRoots] = useState(() => [...newRoots])

  // Navigation state: 'grid' | 'detail' | 'concordance'
  const [view, setView] = useState('grid')
  const [selectedRoot, setSelectedRoot] = useState(null)
  const [selectedWordKey, setSelectedWordKey] = useState(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Clear the badge immediately on mount.
  useEffect(() => {
    markRootsAsViewed()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Create search index from discovered roots
  const searchIndex = useMemo(() => {
    return createSearchIndex(discoveredRoots, { roots: getAllRoots() }, { words: getAllWords() })
  }, [discoveredRoots])

  // Search roots based on query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return searchIndex.map(item => ({ ...item, score: 0 }))
    }
    return searchRoots(searchQuery, searchIndex)
  }, [searchQuery, searchIndex])

  // Sort: new cards first, then the rest in discovery order, filtered by search
  const sortedRoots = useMemo(() => {
    const filteredRoots = searchQuery.trim()
      ? searchResults.map(result => ({
          id: result.id,
          sbl: result.sbl,
          gloss: result.gloss,
          strongs: result.strongs,
        }))
      : discoveredRoots
    
    return [...filteredRoots].sort((a, b) => {
      const aNew = sessionNewRoots.some(r => r.id === a.id)
      const bNew = sessionNewRoots.some(r => r.id === b.id)
      if (aNew && !bNew) return -1
      if (!aNew && bNew) return 1
      return 0
    })
  }, [discoveredRoots, sessionNewRoots, searchQuery, searchResults])

  const hasCards = discoveredRoots.length > 0
  const hasSearchResults = searchQuery.trim() && searchResults.length > 0
  const hasNoSearchResults = searchQuery.trim() && searchResults.length === 0

  // ── Concordance view ─────────────────────────────────────────────
  if (view === 'concordance' && selectedWordKey) {
    return (
      <ConcordancePanel
        wordKey={selectedWordKey}
        onBack={() => setView('detail')}
      />
    )
  }

  // ── Detail view ──────────────────────────────────────────────────
  if (view === 'detail' && selectedRoot) {
    const fullRoot = { ...selectedRoot, ...getAllRoots()[selectedRoot.id] }
    return (
      <RootDetail
        root={fullRoot}
        onBack={() => { setSelectedRoot(null); setView('grid') }}
        onCheckConcordance={(wordKey) => { setSelectedWordKey(wordKey); setView('concordance') }}
      />
    )
  }

  // ── Grid view ────────────────────────────────────────────────────
  return (
    <div className="lexicon-panel">
      {/* ── Header ── */}
      <div className="lexicon-header">
        <h1 className="lexicon-title">Lexicon</h1>
        
        {/* Search Bar */}
        {hasCards && (
          <div className="lexicon-search-container">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search roots, words, or meanings..."
            />
          </div>
        )}
        
        <p className="lexicon-subtitle">
          {hasSearchResults ? (
            <span>
              Found <strong>{searchResults.length}</strong> root{searchResults.length !== 1 ? 's' : ''} matching "<strong>{searchQuery}</strong>"
            </span>
          ) : hasNoSearchResults ? (
            <span>
              No roots found matching "<strong>{searchQuery}</strong>"
            </span>
          ) : hasCards ? (
            `${discoveredRoots.length} of ${TOTAL_ROOTS} roots collected`
          ) : (
            'Discover Hebrew roots as you type'
          )}
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

      {/* ── Search no results state ── */}
      {hasNoSearchResults && (
        <div className="lexicon-search-empty">
          <div className="lexicon-search-empty__icon">🔍</div>
          <p className="lexicon-search-empty__text">
            No roots found matching "<strong>{searchQuery}</strong>"
          </p>
          <p className="lexicon-search-empty__hint">
            Try searching in Hebrew, English, or SBL transliteration
          </p>
        </div>
      )}

      {/* ── Card grid ── */}
      {hasCards && !hasNoSearchResults && (
        <div className="lexicon-grid">
          {sortedRoots.map((root) => {
            const newIdx = sessionNewRoots.findIndex(r => r.id === root.id)
            const isNew = newIdx >= 0
            
            // Get search result data for highlighting
            const searchResult = searchResults.find(r => r.id === root.id)
            const searchScore = searchResult?.score || 0
            
            return (
              <RootCard
                key={root.id}
                root={root}
                isNew={isNew}
                popDelay={isNew ? newIdx * 200 : 0}
                onSelect={(r) => { setSelectedRoot(r); setView('detail') }}
                searchScore={searchScore}
                searchQuery={searchQuery}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
