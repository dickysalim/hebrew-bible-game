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

    const loadForUser = async () => {
      const sessionCached = loadFromSessionCache(userId)
      if (sessionCached) {
        setCachedProgress(sessionCached)
        setCacheStatus('ready')
        return
      }

      setCacheStatus('loading')
      try {
        const supabaseProgress = await loadProgress(userId)
        const formatted = supabaseProgress
          ? formatProgressFromSupabase(supabaseProgress)
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

  const updateCache = useCallback((rawGameState, discoveredRoots, discoveredWordsByRoot, settings = {}, fcSettings = null) => {
    if (!userId) return

    setCachedProgress(prev => {
      const updated = {
        discoveredRoots: discoveredRoots || [],
        discoveredWordsByRoot: discoveredWordsByRoot || {},
        currentStageIndex: rawGameState.currentStageIndex ?? 1,
        highestWordOrder: rawGameState.highestWordOrder ?? 0,
        currentWordOrder: rawGameState.currentWordOrder ?? 1,
        typedChars: rawGameState.typedChars ?? 0,
        settings: {
          showSBLWord: settings.showSBLWord ?? prev?.settings?.showSBLWord ?? true,
          showSBLLetter: settings.showSBLLetter ?? prev?.settings?.showSBLLetter ?? true,
          showGloss: settings.showGloss ?? prev?.settings?.showGloss ?? true,
          showTAHOT: settings.showTAHOT ?? prev?.settings?.showTAHOT ?? true,
          showNikud: settings.showNikud ?? prev?.settings?.showNikud ?? false,
          expertMode: settings.expertMode ?? prev?.settings?.expertMode ?? false,
        },
        alphabetProgress: prev?.alphabetProgress || {},
        fcSettings: fcSettings !== null ? fcSettings : (prev?.fcSettings || {}),
      }
      writeToSessionCache(userId, updated, new Date().toISOString())
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

        const progressForSupabase = formatProgressForSupabase(
          rawGameState,
          discoveredRoots,
          discoveredWordsByRoot,
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
