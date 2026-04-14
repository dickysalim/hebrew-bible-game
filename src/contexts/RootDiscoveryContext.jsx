import { createContext, useContext, useState, useCallback } from 'react'

// Root discovery state that needs to be shared across components
const RootDiscoveryContext = createContext()

export function RootDiscoveryProvider({ children }) {
  // State for discovered roots (all roots discovered in current session)
  const [discoveredRoots, setDiscoveredRoots] = useState([])
  
  // State for new roots (roots discovered but not yet viewed in Lexicon)
  const [newRoots, setNewRoots] = useState([])
  
  // State for discovered words by root
  const [discoveredWordsByRoot, setDiscoveredWordsByRoot] = useState({})

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
  }, [])

  // Add discovered words for a root
  const addDiscoveredWordsForRoot = useCallback((rootId, words) => {
    setDiscoveredWordsByRoot(prev => ({
      ...prev,
      [rootId]: [...(prev[rootId] || []), ...words]
    }))
  }, [])

  // Mark roots as viewed (when Lexicon panel is opened)
  const markRootsAsViewed = useCallback(() => {
    setNewRoots([])
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
    addDiscoveredRoot,
    addDiscoveredWordsForRoot,
    markRootsAsViewed,
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