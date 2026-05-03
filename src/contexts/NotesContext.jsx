import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { loadAllNotes, saveNote as saveNoteToDB, noteKey } from '../lib/notes'

/**
 * NotesContext — session-scoped cache for all user verse notes.
 *
 * Strategy:
 *   - On mount (userId available): fetch ALL notes in one query → sessionStorage
 *   - getNote(book, chapter, verse): O(1) map lookup, never hits DB
 *   - saveNote(book, chapter, verse, content): write-through (cache first, then DB)
 *   - clearNotesCache(): called on sign-out to purge session data
 */

const SESSION_KEY = (userId) => `hebrew-bible-notes-${userId}`

function readSessionCache(userId) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSessionCache(userId, map) {
  try {
    sessionStorage.setItem(SESSION_KEY(userId), JSON.stringify(map))
  } catch {}
}

function removeSessionCache(userId) {
  try {
    if (userId) sessionStorage.removeItem(SESSION_KEY(userId))
  } catch {}
}

const NotesContext = createContext(null)

export function NotesProvider({ children, userId }) {
  // The in-memory notes map: { [noteKey]: htmlContent }
  const [notesMap, setNotesMap] = useState({})
  const [loadStatus, setLoadStatus] = useState('idle') // idle | loading | ready | error
  const saveTimerRef = useRef({}) // { [key]: timeoutId } — per-note debounce

  // Load all notes once when userId becomes available
  useEffect(() => {
    if (!userId) {
      setNotesMap({})
      setLoadStatus('idle')
      return
    }

    // Fast path — already fetched this session
    const cached = readSessionCache(userId)
    if (cached) {
      setNotesMap(cached)
      setLoadStatus('ready')
      return
    }

    // Slow path — first visit this session, fetch from Supabase
    setLoadStatus('loading')
    loadAllNotes(userId)
      .then((map) => {
        setNotesMap(map)
        writeSessionCache(userId, map)
        setLoadStatus('ready')
      })
      .catch((err) => {
        console.error('[NotesContext] Failed to load notes:', err)
        setLoadStatus('error')
      })
  }, [userId])

  /**
   * Get a note's HTML content synchronously.
   * Returns '' if no note exists (never shows a loading state).
   */
  const getNote = useCallback(
    (book, chapter, verse) => notesMap[noteKey(book, chapter, verse)] ?? '',
    [notesMap]
  )

  /**
   * Save a note — write-through: update cache immediately, debounce DB write.
   * @param {string} book
   * @param {number} chapter
   * @param {number} verse
   * @param {string} content  HTML string
   * @param {function} onStatus  (status: 'saving'|'saved'|'error') => void
   */
  const saveNote = useCallback(
    (book, chapter, verse, content, onStatus) => {
      if (!userId) return
      const key = noteKey(book, chapter, verse)

      // 1. Write to in-memory map immediately
      setNotesMap((prev) => {
        const next = { ...prev }
        if (!content || content.replace(/<[^>]*>/g, '').trim() === '') {
          delete next[key]
        } else {
          next[key] = content
        }
        writeSessionCache(userId, next)
        return next
      })

      // 2. Debounced DB write — cancel any pending save for this same key
      if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key])
      onStatus?.('saving')

      saveTimerRef.current[key] = setTimeout(async () => {
        const ok = await saveNoteToDB(userId, String(book).toLowerCase(), chapter, verse, content)
        onStatus?.(ok ? 'saved' : 'error')
        delete saveTimerRef.current[key]
      }, 1000)
    },
    [userId]
  )

  /** Purge session cache on sign-out. */
  const clearNotesCache = useCallback(() => {
    Object.values(saveTimerRef.current).forEach(clearTimeout)
    saveTimerRef.current = {}
    removeSessionCache(userId)
    setNotesMap({})
    setLoadStatus('idle')
  }, [userId])

  return (
    <NotesContext.Provider value={{ getNote, saveNote, clearNotesCache, loadStatus }}>
      {children}
    </NotesContext.Provider>
  )
}

export function useNotes() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider')
  return ctx
}
