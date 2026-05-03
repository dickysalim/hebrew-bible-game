import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  loadAllNotes, saveNote as saveNoteToDB, noteKey,
  loadAllChapterNotes, saveChapterNote as saveChapterNoteToDB, chapterNoteKey,
} from '../lib/notes'

/**
 * NotesContext — session-scoped cache for all user verse AND chapter notes.
 *
 * Strategy:
 *   - On mount (userId available): fetch ALL notes in one query each → sessionStorage
 *   - getNote / getChapterNote: O(1) map lookup, never hits DB
 *   - saveNote / saveChapterNote: write-through (cache first, then debounced DB write)
 *   - clearNotesCache(): called on sign-out to purge session data
 */

const SESSION_KEY         = (userId) => `hebrew-bible-notes-${userId}`
const SESSION_KEY_CHAPTER = (userId) => `hebrew-bible-chapter-notes-${userId}`

function readSession(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeSession(key, map) {
  try { sessionStorage.setItem(key, JSON.stringify(map)) } catch {}
}

function removeSession(key) {
  try { sessionStorage.removeItem(key) } catch {}
}

const NotesContext = createContext(null)

export function NotesProvider({ children, userId }) {
  const [notesMap,        setNotesMap]        = useState({})
  const [chapterNotesMap, setChapterNotesMap] = useState({})
  const [loadStatus,      setLoadStatus]      = useState('idle') // idle | loading | ready | error

  const saveTimerRef = useRef({})

  // Load all notes once when userId becomes available
  useEffect(() => {
    if (!userId) {
      setNotesMap({})
      setChapterNotesMap({})
      setLoadStatus('idle')
      return
    }

    const cachedVerse   = readSession(SESSION_KEY(userId))
    const cachedChapter = readSession(SESSION_KEY_CHAPTER(userId))

    if (cachedVerse && cachedChapter) {
      setNotesMap(cachedVerse)
      setChapterNotesMap(cachedChapter)
      setLoadStatus('ready')
      return
    }

    setLoadStatus('loading')
    Promise.all([
      loadAllNotes(userId),
      loadAllChapterNotes(userId),
    ])
      .then(([verseMap, chMap]) => {
        setNotesMap(verseMap)
        setChapterNotesMap(chMap)
        writeSession(SESSION_KEY(userId),         verseMap)
        writeSession(SESSION_KEY_CHAPTER(userId), chMap)
        setLoadStatus('ready')
      })
      .catch((err) => {
        console.error('[NotesContext] Failed to load notes:', err)
        setLoadStatus('error')
      })
  }, [userId])

  // ─── Verse notes ────────────────────────────────────────────────────────────

  const getNote = useCallback(
    (book, chapter, verse) => notesMap[noteKey(book, chapter, verse)] ?? '',
    [notesMap]
  )

  const saveNote = useCallback(
    (book, chapter, verse, content, onStatus) => {
      if (!userId) return
      const key = noteKey(book, chapter, verse)

      setNotesMap((prev) => {
        const next = { ...prev }
        if (!content || content.replace(/<[^>]*>/g, '').trim() === '') {
          delete next[key]
        } else {
          next[key] = content
        }
        writeSession(SESSION_KEY(userId), next)
        return next
      })

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

  // ─── Chapter notes ───────────────────────────────────────────────────────────

  const getChapterNote = useCallback(
    (book, chapter) => chapterNotesMap[chapterNoteKey(book, chapter)] ?? '',
    [chapterNotesMap]
  )

  const saveChapterNote = useCallback(
    (book, chapter, content, onStatus) => {
      if (!userId) return
      const key = chapterNoteKey(book, chapter)

      setChapterNotesMap((prev) => {
        const next = { ...prev }
        if (!content || content.replace(/<[^>]*>/g, '').trim() === '') {
          delete next[key]
        } else {
          next[key] = content
        }
        writeSession(SESSION_KEY_CHAPTER(userId), next)
        return next
      })

      if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key])
      onStatus?.('saving')

      saveTimerRef.current[key] = setTimeout(async () => {
        const ok = await saveChapterNoteToDB(userId, book, chapter, content)
        onStatus?.(ok ? 'saved' : 'error')
        delete saveTimerRef.current[key]
      }, 1000)
    },
    [userId]
  )

  // ─── Cache purge ─────────────────────────────────────────────────────────────

  const clearNotesCache = useCallback(() => {
    Object.values(saveTimerRef.current).forEach(clearTimeout)
    saveTimerRef.current = {}
    removeSession(SESSION_KEY(userId))
    removeSession(SESSION_KEY_CHAPTER(userId))
    setNotesMap({})
    setChapterNotesMap({})
    setLoadStatus('idle')
  }, [userId])

  return (
    <NotesContext.Provider value={{
      getNote, saveNote,
      getChapterNote, saveChapterNote,
      clearNotesCache, loadStatus,
    }}>
      {children}
    </NotesContext.Provider>
  )
}

export function useNotes() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider')
  return ctx
}
