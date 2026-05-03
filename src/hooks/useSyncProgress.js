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
  // Gates Supabase saves so we don't write empty state before initial load completes.
  const readyToSaveRef = useRef(!userId || cacheStatus === 'ready')
  const hasRestoredRootsRef = useRef(false)

  // Save progress to localStorage when relevant state changes (anonymous users only)
  useEffect(() => {
    if (!isLoaded || userId) return
    const si = state.stageIndex
    const updatedChapters = {
      ...state.chapters,
      [si]: {
        typedCounts: state.typedCounts,
        wordEncounters: state.wordEncounters,
        highestVerse: state.highestVerse,
        currentVerse: state.currentVerse,
        activeWordIdx: state.activeWordIdx,
        carouselIdxMap: state.carouselIdxMap,
        celebratedVerses: state.celebratedVerses,
      },
    }
    saveProgress({ stageIndex: si, chapters: updatedChapters })
  }, [
    isLoaded,
    userId,
    state.stageIndex,
    state.typedCounts,
    state.wordEncounters,
    state.highestVerse,
    state.currentVerse,
    state.activeWordIdx,
    state.carouselIdxMap,
    state.celebratedVerses,
    state.chapters,
    saveProgress,
  ])

  // Sync RootDiscoveryContext from cache once when Supabase data arrives.
  // Previously had [] deps — caused it to run at mount when cachedProgress was still null.
  useEffect(() => {
    if (!userId || cacheStatus !== 'ready') return
    readyToSaveRef.current = true
    if (hasRestoredRootsRef.current || !cachedProgress) return
    hasRestoredRootsRef.current = true
    if (cachedProgress.discoveredRoots) updateDiscoveredRoots(cachedProgress.discoveredRoots)
    if (cachedProgress.discoveredWordsByRoot) updateDiscoveredWordsByRoot(cachedProgress.discoveredWordsByRoot)
  }, [cacheStatus, cachedProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress via cache whenever relevant state changes (authenticated users only).
  // ProgressCacheContext debounces the actual Supabase write.
  useEffect(() => {
    if (!userId || !readyToSaveRef.current) return
    updateCache(
      state,
      contextDiscoveredRoots,
      discoveredWordsByRoot,
      { showSBLWord: state.showSBLWord, showSBLLetter: state.showSBLLetter, expertMode: state.expertMode }
    )
  }, [
    userId,
    state.stageIndex,
    state.typedCounts,
    state.wordEncounters,
    state.currentVerse,
    state.highestVerse,
    state.activeWordIdx,
    state.carouselIdxMap,
    state.celebratedVerses,
    state.showSBLWord,
    state.showSBLLetter,
    state.expertMode,
    contextDiscoveredRoots,
    discoveredWordsByRoot,
  ]) // eslint-disable-line react-hooks/exhaustive-deps
}
