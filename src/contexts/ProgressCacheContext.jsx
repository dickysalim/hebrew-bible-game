import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { loadProgress, saveProgress as saveProgressToSupabase } from '../lib/progress'
import { formatProgressFromSupabase, formatProgressForSupabase } from '../lib/progress'

// User-scoped localStorage key — auto-invalidated when account changes
const cacheKey = (userId) => `hebrew-bible-game-progress-${userId}`

// Max age before re-validating against Supabase (24 hours)
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Debounce delay for Supabase writes (ms) — avoids hammering on rapid state changes
const SAVE_DEBOUNCE_MS = 1500

// Load from user-scoped localStorage — returns null if missing or stale
function loadFromLocalCache(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const age = Date.now() - (parsed._cachedAt ?? 0)
    if (age > MAX_AGE_MS) return null // stale — will re-fetch from Supabase
    return parsed.data ?? null
  } catch {
    return null
  }
}

// Write to user-scoped localStorage with a timestamp
function writeToLocalCache(userId, data) {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ _cachedAt: Date.now(), data })
    )
  } catch {
    // localStorage may be full — ignore silently
  }
}

// Remove a user's local cache entry (on sign-out or explicit clear)
function removeLocalCache(userId) {
  try {
    if (userId) localStorage.removeItem(cacheKey(userId))
  } catch {
    // ignore
  }
}

/**
 * Migrate old flat Supabase cache → per-chapter (v2) structure.
 * If the cache already has a `chapters` map, returns as-is.
 */
function ensurePerChapterCache(formatted) {
  if (!formatted) return null
  // Already v2 — has a chapters map
  if (formatted.chapters) return formatted
  // Flat v1 → wrap current stageIndex progress into chapters map
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
  }
}

const ProgressCacheContext = createContext(null)

/**
 * ProgressCacheProvider
 *
 * Lifecycle:
 *  - On mount / userId change → try localStorage (if not stale) → else fetch Supabase
 *  - updateCache(progressObj) → writes memory + localStorage + debounced Supabase save
 *  - When userId changes (account switch) → evict old cache, load new user's data
 *  - No userId → cache stays idle (unauthenticated users use their own localStorage hook)
 */
export function ProgressCacheProvider({ children, userId }) {
  const [cachedProgress, setCachedProgress] = useState(null)
  // 'idle' | 'loading' | 'ready' | 'error'
  const [cacheStatus, setCacheStatus] = useState('idle')
  // Track which userId the cache currently belongs to
  const cacheUserIdRef = useRef(null)

  // Debounce timer ref for Supabase saves
  const saveTimerRef = useRef(null)

  // Fetch progress for the current user (Supabase → memory → localStorage)
  useEffect(() => {
    if (!userId) {
      // No session — clear any stale cache state
      setCachedProgress(null)
      setCacheStatus('idle')
      cacheUserIdRef.current = null
      return
    }

    // If userId changed (account switch), evict the old cache first
    if (cacheUserIdRef.current && cacheUserIdRef.current !== userId) {
      // Do NOT remove their localStorage — keep it for future fast re-login.
      // Just clear the in-memory snapshot.
      setCachedProgress(null)
      setCacheStatus('idle')
    }

    cacheUserIdRef.current = userId

    const loadForUser = async () => {
      // 1. Try local cache (fresh within 24h)
      const local = loadFromLocalCache(userId)
      if (local) {
        setCachedProgress(ensurePerChapterCache(local))
        setCacheStatus('ready')
        return
      }

      // 2. Fetch from Supabase
      setCacheStatus('loading')
      try {
        const supabaseProgress = await loadProgress(userId)
        const formatted = supabaseProgress
          ? ensurePerChapterCache(formatProgressFromSupabase(supabaseProgress))
          : null

        // Store in memory + local cache
        setCachedProgress(formatted)
        if (formatted) writeToLocalCache(userId, formatted)
        setCacheStatus('ready')
      } catch (err) {
        console.error('[ProgressCache] Failed to load from Supabase:', err)
        // Fall back to empty progress so the game isn't blocked
        setCachedProgress(null)
        setCacheStatus('error')
      }
    }

    loadForUser()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * updateCache — called by GamePanel whenever game state changes.
   * Updates in-memory cache and localStorage immediately, then debounces the
   * Supabase write so rapid typing doesn't send a request per keypress.
   *
   * Now stores per-chapter state in a `chapters` map keyed by stageIndex.
   *
   * @param {object} rawGameState — raw reducer state
   * @param {array}  discoveredRoots — from RootDiscoveryContext
   * @param {object} discoveredWordsByRoot — from RootDiscoveryContext
   */
  const updateCache = useCallback((rawGameState, discoveredRoots, discoveredWordsByRoot) => {
    if (!userId) return

    const si = rawGameState.stageIndex || 1

    // Build per-chapter entry for the CURRENT stageIndex
    const chapterEntry = {
      typedCounts: rawGameState.typedCounts || {},
      wordEncounters: rawGameState.wordEncounters || {},
      highestVerse: rawGameState.highestVerse || 0,
      currentVerse: rawGameState.currentVerse || 0,
      activeWordIdx: rawGameState.activeWordIdx ?? 0,
      carouselIdxMap: rawGameState.carouselIdxMap || {},
      celebratedVerses: rawGameState.celebratedVerses || [],
    }

    // Merge with existing cache — keep other chapters' data intact
    setCachedProgress(prev => {
      const prevChapters = prev?.chapters || {}
      const updated = {
        discoveredRoots: discoveredRoots || [],
        discoveredWordsByRoot: discoveredWordsByRoot || {},
        stageIndex: si,
        chapters: {
          ...prevChapters,
          [si]: chapterEntry,
        },
      }
      writeToLocalCache(userId, updated)
      return updated
    })

    // Debounce the Supabase write
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Read the latest cache to make sure we send ALL chapters
        const latestRaw = localStorage.getItem(cacheKey(userId))
        let latestChapters = {}
        if (latestRaw) {
          try {
            const parsed = JSON.parse(latestRaw)
            latestChapters = parsed?.data?.chapters || {}
          } catch { /* ignore */ }
        }
        // Ensure current chapter is included
        latestChapters[si] = chapterEntry

        const progressForSupabase = formatProgressForSupabase(
          rawGameState,
          discoveredRoots,
          discoveredWordsByRoot,
          latestChapters
        )
        await saveProgressToSupabase(userId, progressForSupabase)
      } catch (err) {
        console.error('[ProgressCache] Failed to save to Supabase:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [userId])

  /**
   * clearCache — wipes in-memory state and the user's localStorage entry.
   * Call on sign-out or explicit progress reset.
   */
  const clearCache = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    removeLocalCache(userId)
    setCachedProgress(null)
    setCacheStatus('idle')
  }, [userId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return (
    <ProgressCacheContext.Provider value={{ cachedProgress, cacheStatus, updateCache, clearCache }}>
      {children}
    </ProgressCacheContext.Provider>
  )
}

export function useProgressCache() {
  const ctx = useContext(ProgressCacheContext)
  if (!ctx) throw new Error('useProgressCache must be used within a ProgressCacheProvider')
  return ctx
}
