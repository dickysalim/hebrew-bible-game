import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { loadProgress, saveProgress as saveProgressToSupabase, savePartialProgress, deleteProgress } from '../lib/progress'
import { formatProgressFromSupabase, formatProgressForSupabase } from '../lib/progress'

const cacheKey = (userId) => `hebrew-bible-game-progress-${userId}`
const SAVE_DEBOUNCE_MS = 1500

function loadFromLocalCache(userId) {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data ?? null
  } catch {
    return null
  }
}

function writeToLocalCache(userId, data) {
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify({ data }))
  } catch {}
}

function removeLocalCache(userId) {
  try {
    if (userId) sessionStorage.removeItem(cacheKey(userId))
  } catch {}
}

function ensurePerChapterCache(formatted) {
  if (!formatted) return null
  if (formatted.chapters) return formatted
  const si = formatted.stageIndex || 1
  return {
    ...formatted,
    stageIndex: si,
    chapters: {
      [si]: {
        typedCounts: formatted.typedCounts || {},
        wordEncounters: formatted.wordEncounters || {},
        highestVerse: formatted.highestVerse || 0,
        currentVerse: formatted.currentVerseIndex ?? formatted.currentVerse ?? 0,
        activeWordIdx: formatted.activeWordIdx ?? 0,
        carouselIdxMap: formatted.carouselIdxMap || {},
        celebratedVerses: formatted.celebratedVerses || [],
      },
    },
    // Carry forward new fields if present, otherwise defaults
    settings: formatted.settings || { showSBLWord: true, showSBLLetter: true },
    alphabetProgress: formatted.alphabetProgress || {},
  }
}

const ProgressCacheContext = createContext(null)

export function ProgressCacheProvider({ children, userId }) {
  const [cachedProgress, setCachedProgress] = useState(null)
  const [cacheStatus, setCacheStatus] = useState('idle')
  const cacheUserIdRef = useRef(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (!userId) {
      setCachedProgress(null)
      setCacheStatus('idle')
      cacheUserIdRef.current = null
      return
    }

    if (cacheUserIdRef.current && cacheUserIdRef.current !== userId) {
      setCachedProgress(null)
      setCacheStatus('idle')
    }

    cacheUserIdRef.current = userId

    // Clean up any stale localStorage entry left from the old caching strategy.
    // Progress is now session-only (sessionStorage), so localStorage data is obsolete.
    try { localStorage.removeItem(cacheKey(userId)) } catch {}

    const loadForUser = async () => {
      const local = loadFromLocalCache(userId)
      if (local) {
        setCachedProgress(ensurePerChapterCache(local))
        setCacheStatus('ready')
        return
      }

      setCacheStatus('loading')
      try {
        const supabaseProgress = await loadProgress(userId)
        const formatted = supabaseProgress
          ? ensurePerChapterCache(formatProgressFromSupabase(supabaseProgress))
          : null

        setCachedProgress(formatted)
        if (formatted) writeToLocalCache(userId, formatted)
        setCacheStatus('ready')
      } catch (err) {
        console.error('[ProgressCache] Failed to load from Supabase:', err)
        setCachedProgress(null)
        setCacheStatus('error')
      }
    }

    loadForUser()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * updateCache — called by GamePanel on every state change.
   * Now also persists settings (showSBLWord / showSBLLetter).
   *
   * @param {object} rawGameState
   * @param {array}  discoveredRoots
   * @param {object} discoveredWordsByRoot
   * @param {object} settings — { showSBLWord, showSBLLetter }
   */
  const updateCache = useCallback((rawGameState, discoveredRoots, discoveredWordsByRoot, settings = {}) => {
    if (!userId) return

    const si = rawGameState.stageIndex || 1

    const chapterEntry = {
      typedCounts: rawGameState.typedCounts || {},
      wordEncounters: rawGameState.wordEncounters || {},
      highestVerse: rawGameState.highestVerse || 0,
      currentVerse: rawGameState.currentVerse || 0,
      activeWordIdx: rawGameState.activeWordIdx ?? 0,
      carouselIdxMap: rawGameState.carouselIdxMap || {},
      celebratedVerses: rawGameState.celebratedVerses || [],
    }

    setCachedProgress(prev => {
      const prevChapters = prev?.chapters || {}
      const updated = {
        discoveredRoots: discoveredRoots || [],
        discoveredWordsByRoot: discoveredWordsByRoot || {},
        stageIndex: si,
        chapters: { ...prevChapters, [si]: chapterEntry },
        settings: {
          showSBLWord: settings.showSBLWord ?? prev?.settings?.showSBLWord ?? true,
          showSBLLetter: settings.showSBLLetter ?? prev?.settings?.showSBLLetter ?? true,
        },
        // Preserve existing alphabet progress
        alphabetProgress: prev?.alphabetProgress || {},
      }
      writeToLocalCache(userId, updated)
      return updated
    })

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const latestRaw = sessionStorage.getItem(cacheKey(userId))
        let latestData = {}
        if (latestRaw) {
          try { latestData = JSON.parse(latestRaw)?.data || {} } catch {}
        }
        let latestChapters = latestData.chapters || {}
        latestChapters[si] = chapterEntry

        const progressForSupabase = formatProgressForSupabase(
          rawGameState,
          discoveredRoots,
          discoveredWordsByRoot,
          latestChapters,
          latestData.settings || {},
          latestData.alphabetProgress || {}
        )
        await saveProgressToSupabase(userId, progressForSupabase)
      } catch (err) {
        console.error('[ProgressCache] Failed to save to Supabase:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [userId])

  /**
   * updateAlphabetProgress — called by AlphabetHub when a level is completed.
   * Does a targeted upsert of only the alphabet_progress column.
   */
  const updateAlphabetProgress = useCallback((alphabetProgress) => {
    if (!userId) return

    setCachedProgress(prev => {
      const updated = { ...(prev || {}), alphabetProgress }
      writeToLocalCache(userId, updated)
      return updated
    })

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await savePartialProgress(userId, { alphabet_progress: alphabetProgress })
      } catch (err) {
        console.error('[ProgressCache] Failed to save alphabet progress:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [userId])

  const clearCache = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    removeLocalCache(userId)
    setCachedProgress(null)
    setCacheStatus('idle')
  }, [userId])

  /** Hard reset — deletes Supabase row + clears session cache. Dev-only. */
  const resetProgress = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    removeLocalCache(userId)
    setCachedProgress(null)
    setCacheStatus('idle')
    await deleteProgress(userId)
  }, [userId])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  return (
    <ProgressCacheContext.Provider
      value={{ cachedProgress, cacheStatus, updateCache, updateAlphabetProgress, clearCache, resetProgress }}
    >
      {children}
    </ProgressCacheContext.Provider>
  )
}

export function useProgressCache() {
  const ctx = useContext(ProgressCacheContext)
  if (!ctx) throw new Error('useProgressCache must be used within a ProgressCacheProvider')
  return ctx
}
