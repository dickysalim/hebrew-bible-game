import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { loadProgress, saveProgress as saveProgressToSupabase, savePartialProgress, deleteProgress } from '../lib/progress'
import { formatProgressFromSupabase, formatProgressForSupabase } from '../lib/progress'

const cacheKey = (userId) => `hebrew-bible-game-progress-${userId}`
const SAVE_DEBOUNCE_MS = 1500

function loadFromSessionCache(userId) {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data ?? null
  } catch {
    return null
  }
}

function loadSessionCacheTimestamp(userId) {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.updatedAt ?? null
  } catch {
    return null
  }
}

function writeToSessionCache(userId, data, updatedAt = null) {
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify({ data, updatedAt }))
  } catch {}
}

function removeSessionCache(userId) {
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
    settings: formatted.settings || { showSBLWord: true, showSBLLetter: true, showGloss: true, showTAHOT: true, expertMode: false },
    alphabetProgress: formatted.alphabetProgress || {},
    fcSettings: formatted.fcSettings || {},
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

    // sessionStorage is the fast-path cache for this browser session only.
    // It's cleared when the tab/browser closes, so every new session always
    // fetches the latest progress from Supabase — ensuring cross-device sync.

    const loadForUser = async () => {
      const sessionCached = loadFromSessionCache(userId)
      if (sessionCached) {
        // Fast path: already fetched from Supabase this session
        setCachedProgress(ensurePerChapterCache(sessionCached))
        setCacheStatus('ready')
        return
      }

      // No session cache — always fetch from Supabase
      setCacheStatus('loading')
      try {
        const supabaseProgress = await loadProgress(userId)
        const formatted = supabaseProgress
          ? ensurePerChapterCache(formatProgressFromSupabase(supabaseProgress))
          : null

        setCachedProgress(formatted)
        if (formatted) writeToSessionCache(userId, formatted, supabaseProgress?.updated_at ?? null)
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
   * Persists game settings (showSBLWord / showSBLLetter / showGloss / showTAHOT / expertMode).
   *
   * @param {object} rawGameState
   * @param {array}  discoveredRoots
   * @param {object} discoveredWordsByRoot
   * @param {object} settings — { showSBLWord, showSBLLetter, showGloss, showTAHOT, expertMode }
   * @param {object} [fcSettings] — Full Chapter prefs { showGloss, showSBLWord, showSBLLetter, fontSize }
   */
  const updateCache = useCallback((rawGameState, discoveredRoots, discoveredWordsByRoot, settings = {}, fcSettings = null) => {
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
          showGloss: settings.showGloss ?? prev?.settings?.showGloss ?? true,
          showTAHOT: settings.showTAHOT ?? prev?.settings?.showTAHOT ?? true,
          expertMode: settings.expertMode ?? prev?.settings?.expertMode ?? false,
        },
        // Preserve existing alphabet + full-chapter settings
        alphabetProgress: prev?.alphabetProgress || {},
        fcSettings: fcSettings !== null ? fcSettings : (prev?.fcSettings || {}),
      }
      writeToSessionCache(userId, updated, new Date().toISOString())
      return updated
    })

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Read from sessionStorage — this is where writeToSessionCache writes
        const latestRaw = sessionStorage.getItem(cacheKey(userId))
        let latestData = {}
        if (latestRaw) {
          try { latestData = JSON.parse(latestRaw)?.data || {} } catch {}
        }
        // Merge the freshest chapter entry into all known chapters
        const latestChapters = { ...(latestData.chapters || {}), [si]: chapterEntry }

        const progressForSupabase = formatProgressForSupabase(
          rawGameState,
          discoveredRoots,
          discoveredWordsByRoot,
          latestChapters,
          latestData.settings || {},
          latestData.alphabetProgress || {},
          latestData.fcSettings || {}
        )
        await saveProgressToSupabase(userId, progressForSupabase)
      } catch (err) {
        console.error('[ProgressCache] Failed to save to Supabase:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [userId])

  /**
   * updateFcSettings — called by the Full Chapter panel.
   * Only patches the fcSettings field; game progress is untouched.
   */
  const updateFcSettings = useCallback((patch) => {
    if (!userId) return

    setCachedProgress(prev => {
      const updated = {
        ...(prev || {}),
        fcSettings: { ...(prev?.fcSettings || {}), ...patch },
      }
      writeToSessionCache(userId, updated, new Date().toISOString())
      return updated
    })

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const latestRaw = sessionStorage.getItem(cacheKey(userId))
        let fcSettings = {}
        if (latestRaw) {
          try { fcSettings = JSON.parse(latestRaw)?.data?.fcSettings || {} } catch {}
        }
        await savePartialProgress(userId, { fc_settings: fcSettings })
      } catch (err) {
        console.error('[ProgressCache] Failed to save fc_settings:', err)
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
      writeToSessionCache(userId, updated, new Date().toISOString())
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
    removeSessionCache(userId)
    setCachedProgress(null)
    setCacheStatus('idle')
  }, [userId])

  /** Hard reset — deletes Supabase row + clears session cache. Dev-only. */
  const resetProgress = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    removeSessionCache(userId)
    setCachedProgress(null)
    setCacheStatus('idle')
    await deleteProgress(userId)
  }, [userId])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  return (
    <ProgressCacheContext.Provider
      value={{ cachedProgress, cacheStatus, updateCache, updateFcSettings, updateAlphabetProgress, clearCache, resetProgress }}
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
