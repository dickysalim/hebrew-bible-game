import { useEffect, useRef } from 'react'

export function useSyncProgress({
  userId,
  isLoaded,
  cacheStatus,
  state,
  cachedProgress,
  contextDiscoveredRoots,
  discoveredWordsByRoot,
  saveProgress,
  updateCache,
  updateDiscoveredRoots,
  updateDiscoveredWordsByRoot,
}) {
  const readyToSaveRef = useRef(!userId || cacheStatus === 'ready')
  const hasRestoredRootsRef = useRef(false)

  useEffect(() => {
    if (!isLoaded || userId) return
    saveProgress({
      currentStageIndex: state.currentStageIndex,
      highestWordOrder: state.highestWordOrder,
      currentWordOrder: state.currentWordOrder,
      typedChars: state.typedChars,
    })
  }, [
    isLoaded,
    userId,
    state.currentStageIndex,
    state.highestWordOrder,
    state.currentWordOrder,
    state.typedChars,
    saveProgress,
  ])

  useEffect(() => {
    if (!userId || cacheStatus !== 'ready') return
    readyToSaveRef.current = true
    if (hasRestoredRootsRef.current || !cachedProgress) return
    hasRestoredRootsRef.current = true
    if (cachedProgress.discoveredRoots) updateDiscoveredRoots(cachedProgress.discoveredRoots)
    if (cachedProgress.discoveredWordsByRoot) updateDiscoveredWordsByRoot(cachedProgress.discoveredWordsByRoot)
  }, [cacheStatus, cachedProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId || !readyToSaveRef.current) return
    updateCache(
      state,
      contextDiscoveredRoots,
      discoveredWordsByRoot,
      {
        showSBLWord: state.showSBLWord,
        showSBLLetter: state.showSBLLetter,
        showGloss: state.showGloss,
        showTAHOT: state.showTAHOT,
        showNikud: state.showNikud,
        expertMode: state.expertMode,
      }
    )
  }, [
    userId,
    state.currentStageIndex,
    state.highestWordOrder,
    state.currentWordOrder,
    state.typedChars,
    state.showSBLWord,
    state.showSBLLetter,
    state.showGloss,
    state.showTAHOT,
    state.showNikud,
    state.expertMode,
    contextDiscoveredRoots,
    discoveredWordsByRoot,
  ]) // eslint-disable-line react-hooks/exhaustive-deps
}
