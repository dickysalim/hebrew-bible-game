import { useEffect, useRef, useCallback } from 'react'
import { useNotes } from '../../../contexts/NotesContext'

/**
 * VerseNotesTab — rich-text (B/I/U only) note editor for the active verse.
 *
 * Reads from and writes to NotesContext (session-scoped cache).
 * Zero loading state — notes are always pre-populated from the bulk fetch
 * that happens once at login.
 */
export default function VerseNotesTab({ userId, book, chapter, verse }) {
  const { getNote, saveNote, loadStatus } = useNotes()
  const editorRef = useRef(null)
  const statusSpanRef = useRef(null)

  // Write save status directly to the DOM span — avoids re-rendering the contentEditable
  const setStatus = useCallback((s) => {
    if (statusSpanRef.current) {
      statusSpanRef.current.textContent =
        s === 'saving' ? '⏳ Saving…' :
        s === 'saved'  ? '✓ Saved'   :
        s === 'error'  ? '⚠ Save failed' : ''
    }
  }, [])

  const verseKey = `${book}-${chapter}-${verse}`
  const prevVerseKeyRef = useRef(null)

  // Sync editor content whenever verse changes (or cache becomes ready)
  useEffect(() => {
    if (loadStatus !== 'ready') return
    if (!editorRef.current) return

    const content = getNote(book, chapter, verse)
    editorRef.current.innerHTML = content

    // Reset status display on verse change
    if (verseKey !== prevVerseKeyRef.current) {
      setStatus('idle')
      prevVerseKeyRef.current = verseKey
    }
  }, [verseKey, loadStatus, getNote, book, chapter, verse, setStatus])

  const handleInput = useCallback(() => {
    if (!userId) return
    const content = editorRef.current?.innerHTML || ''
    saveNote(book, chapter, verse, content, setStatus)
  }, [userId, book, chapter, verse, saveNote, setStatus])

  const execFormat = (cmd) => {
    document.execCommand(cmd)
    editorRef.current?.focus()
  }

  const stopGameKeys = (e) => {
    e.stopPropagation()
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        document.execCommand('outdent')
      } else {
        document.execCommand('insertText', false, '    ')
      }
    }
  }

  if (!userId) {
    return (
      <div className="notes-empty">
        <span className="notes-empty__icon">🔒</span>
        <p>Sign in to save verse notes</p>
      </div>
    )
  }

  // Cache is still loading on first session (rare — happens once ever)
  if (loadStatus === 'loading') {
    return (
      <div className="notes-empty">
        <span className="notes-empty__icon" style={{ fontSize: 20 }}>⏳</span>
        <p style={{ fontSize: 12 }}>Loading notes…</p>
      </div>
    )
  }

  return (
    <div className="verse-notes">
      <div
        className="verse-notes__inner"
        onClick={() => editorRef.current?.focus()}
      >
        <div className="verse-notes__toolbar">
          <button
            onMouseDown={e => { e.preventDefault(); execFormat('bold') }}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); execFormat('italic') }}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <em>I</em>
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); execFormat('underline') }}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <span className="verse-notes__u-btn">U</span>
          </button>

          <span
            ref={statusSpanRef}
            className="verse-notes__status"
            aria-live="polite"
          />
        </div>

        <div
          ref={editorRef}
          className="verse-notes__editor"
          contentEditable
          onInput={handleInput}
          onKeyDown={stopGameKeys}
          data-placeholder="Write your notes on this verse…"
          suppressContentEditableWarning
          role="textbox"
          aria-label="Verse notes editor"
          aria-multiline="true"
        />
      </div>
    </div>
  )
}
