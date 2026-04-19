import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const LEXICON_STORAGE_KEY = 'hebrew-bible-game-lexicon'

// Load persisted lexicon state (roots + words) from localStorage
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

function loadDiscoveredWordsByRootFromStorage() {
  try {
    const saved = localStorage.getItem(LEXICON_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.discoveredWordsByRoot && typeof parsed.discoveredWordsByRoot === 'object') {
        return parsed.discoveredWordsByRoot
      }
    }
  } catch (e) {
    // ignore
  }
  return {}
}

// Root discovery state that needs to be shared across components
const RootDiscoveryContext = createContext()

export function RootDiscoveryProvider({ children, userId = null }) {
  // State for discovered roots — empty for authenticated users (loaded from Supabase), localStorage for guests
  const [discoveredRoots, setDiscoveredRoots] = useState([])

  // State for new roots (roots discovered but not yet viewed in Lexicon)
  // These are NOT persisted — "new" status resets on page refresh
  const [newRoots, setNewRoots] = useState([])

  // State for discovered words by root
  const [discoveredWordsByRoot, setDiscoveredWordsByRoot] = useState({})

  // Load from localStorage only for unauthenticated users.
  // Authenticated users get their data from Supabase via updateDiscoveredRoots/updateDiscoveredWordsByRoot.
  useEffect(() => {
    if (!userId) {
      setDiscoveredRoots(loadDiscoveredRootsFromStorage())
      setDiscoveredWordsByRoot(loadDiscoveredWordsByRootFromStorage())
    } else {
      // Clear any localStorage data that may have loaded before session resolved
      setDiscoveredRoots([])
      setDiscoveredWordsByRoot({})
    }
  }, [userId])

  // Set of root IDs that are "new" for the current Lexicon visit.
  // Cleared when user leaves the Lexicon panel so highlights disappear on return.
  // Using a ref (not state) so it never triggers re-renders.
  const sessionNewRootIdsRef = useRef(new Set())

  // Persist lexicon state (roots + words) to localStorage whenever it changes
  // Skip localStorage persistence for authenticated users (userId exists)
  useEffect(() => {
    if (userId) {
      // Don't save to localStorage for authenticated users
      return
    }
    try {
      localStorage.setItem(LEXICON_STORAGE_KEY, JSON.stringify({ discoveredRoots, discoveredWordsByRoot }))
    } catch (e) {
      console.error('Failed to save lexicon to localStorage:', e)
    }
  }, [discoveredRoots, discoveredWordsByRoot, userId])

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

  // Update discovered roots from external source (e.g., Supabase)
  const updateDiscoveredRoots = useCallback((rootsArray) => {
    setDiscoveredRoots(rootsArray || [])
  }, [])

  // Update discovered words by root from external source (e.g., Supabase)
  const updateDiscoveredWordsByRoot = useCallback((wordsByRoot) => {
    setDiscoveredWordsByRoot(wordsByRoot || {})
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
    setDiscoveredWordsByRoot({})
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
    updateDiscoveredRoots,
    updateDiscoveredWordsByRoot,
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