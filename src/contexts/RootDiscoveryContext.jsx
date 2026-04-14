import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const LEXICON_STORAGE_KEY = 'hebrew-bible-game-lexicon'

// Load persisted discovered roots from localStorage
function loadDiscoveredRootsFromStorage() {
  try {
    const saved = localStorage.getItem(LEXICON_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.discoveredRoots)) {
        return parsed.discoveredRoots
      }
    }
  } catch (e) {
    console.error('Failed to load lexicon from localStorage:', e)
  }
  return []
}

// Root discovery state that needs to be shared across components
const RootDiscoveryContext = createContext()

export function RootDiscoveryProvider({ children }) {
  // State for discovered roots — initialized from localStorage for persistence across refresh
  const [discoveredRoots, setDiscoveredRoots] = useState(() => loadDiscoveredRootsFromStorage())
  
  // State for new roots (roots discovered but not yet viewed in Lexicon)
  // These are NOT persisted — "new" status resets on page refresh
  const [newRoots, setNewRoots] = useState([])
  
  // State for discovered words by root
  const [discoveredWordsByRoot, setDiscoveredWordsByRoot] = useState({})

  // Set of root IDs that are "new" for the current Lexicon visit.
  // Cleared when user leaves the Lexicon panel so highlights disappear on return.
  // Using a ref (not state) so it never triggers re-renders.
  const sessionNewRootIdsRef = useRef(new Set())

  // Persist discoveredRoots to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LEXICON_STORAGE_KEY, JSON.stringify({ discoveredRoots }))
    } catch (e) {
      console.error('Failed to save lexicon to localStorage:', e)
    }
  }, [discoveredRoots])

  // Add a newly discovered root
  const addDiscoveredRoot = useCallback((rootData) => {
    setDiscoveredRoots(prev => {
      // Check if root already exists
      if (prev.some(root => root.id === rootData.id)) {
        return prev
      }
      return [...prev, rootData]
    })
    
    setNewRoots(prev => {
      // Check if root already in new roots
      if (prev.some(root => root.id === rootData.id)) {
        return prev
      }
      return [...prev, rootData]
    })

    // Track in the session set so the highlight is shown when Lexicon opens
    sessionNewRootIdsRef.current.add(rootData.id)
  }, [])

  // Add discovered words for a root
  const addDiscoveredWordsForRoot = useCallback((rootId, words) => {
    setDiscoveredWordsByRoot(prev => ({
      ...prev,
      [rootId]: [...(prev[rootId] || []), ...words]
    }))
  }, [])

  // Mark roots as viewed (when Lexicon panel is opened) — clears the badge count only.
  // Highlights (sessionNewRootIdsRef) are cleared separately when user leaves the panel.
  const markRootsAsViewed = useCallback(() => {
    setNewRoots([])
  }, [])

  // Clear highlights — called when user leaves the Lexicon panel (on unmount).
  // After this, previously-new cards will render as old cards on the next visit.
  const clearRootHighlights = useCallback(() => {
    sessionNewRootIdsRef.current.clear()
  }, [])

  // Reset all discovered root state — called when the user resets game progress.
  const resetDiscoveredRoots = useCallback(() => {
    setDiscoveredRoots([])
    setNewRoots([])
    sessionNewRootIdsRef.current.clear()
    try {
      localStorage.removeItem(LEXICON_STORAGE_KEY)
    } catch (e) {
      // ignore
    }
  }, [])

  // Get count of new roots
  const getNewRootsCount = useCallback(() => {
    return newRoots.length
  }, [newRoots])

  // Get all discovered roots
  const getAllDiscoveredRoots = useCallback(() => {
    return discoveredRoots
  }, [discoveredRoots])

  // Get discovered words for a specific root
  const getDiscoveredWordsForRoot = useCallback((rootId) => {
    return discoveredWordsByRoot[rootId] || []
  }, [discoveredWordsByRoot])

  const value = {
    discoveredRoots,
    newRoots,
    discoveredWordsByRoot,
    // Ref to the Set of root IDs that are "new" for the current Lexicon visit
    sessionNewRootIdsRef,
    addDiscoveredRoot,
    addDiscoveredWordsForRoot,
    markRootsAsViewed,
    clearRootHighlights,
    resetDiscoveredRoots,
    getNewRootsCount,
    getAllDiscoveredRoots,
    getDiscoveredWordsForRoot
  }

  return (
    <RootDiscoveryContext.Provider value={value}>
      {children}
    </RootDiscoveryContext.Provider>
  )
}

export function useRootDiscovery() {
  const context = useContext(RootDiscoveryContext)
  if (!context) {
    throw new Error('useRootDiscovery must be used within a RootDiscoveryProvider')
  }
  return context
}