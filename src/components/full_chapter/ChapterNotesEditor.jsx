import { useEffect, useRef, useCallback } from 'react'
import { useNotes } from '../../contexts/NotesContext'

/**
 * ChapterNotesEditor — rich-text (B/I/U) note editor for the active chapter.
 *
 * Identical spec to VerseNotesTab but scoped to (book, chapter) via
 * getChapterNote / saveChapterNote from NotesContext.
 */
export default function ChapterNotesEditor({ userId, book, chapter }) {
  const { getChapterNote, saveChapterNote, loadStatus } = useNotes()
  const editorRef    = useRef(null)
  const statusSpanRef = useRef(null)

  const setStatus = useCallback((s) => {
    if (statusSpanRef.current) {
      statusSpanRef.current.textContent =
        s === 'saving' ? '⏳ Saving…' :
        s === 'saved'  ? '✓ Saved'   :
        s === 'error'  ? '⚠ Save failed' : ''
    }
  }, [])

  const chapterKey    = `${book}-${chapter}`
  const prevKeyRef    = useRef(null)

  // Sync editor content when chapter changes or cache becomes ready
  useEffect(() => {
    if (loadStatus !== 'ready') return
    if (!editorRef.current) return

    const content = getChapterNote(book, chapter)
    editorRef.current.innerHTML = content

    if (chapterKey !== prevKeyRef.current) {
      setStatus('idle')
      prevKeyRef.current = chapterKey
    }
  }, [chapterKey, loadStatus, getChapterNote, book, chapter, setStatus])

  const handleInput = useCallback(() => {
    if (!userId) return
    const content = editorRef.current?.innerHTML || ''
    saveChapterNote(book, chapter, content, setStatus)
  }, [userId, book, chapter, saveChapterNote, setStatus])

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
        <p>Sign in to save chapter notes</p>
      </div>
    )
  }

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
          data-placeholder="Write your chapter notes here…"
          suppressContentEditableWarning
          role="textbox"
          aria-label="Chapter notes editor"
          aria-multiline="true"
        />
      </div>
    </div>
  )
}
