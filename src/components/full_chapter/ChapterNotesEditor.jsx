import { useEffect, useRef, useCallback } from 'react'
import { useNotes } from '../../contexts/NotesContext'

/**
 * ChapterNotesEditor — rich-text (B/I/U) note editor for the active chapter.
 *
 * Renders its own header row: "CHAPTER NOTES" label on the left,
 * B/I/U toolbar + save status on the right.
 */
export default function ChapterNotesEditor({ userId, book, chapter }) {
  const { getChapterNote, saveChapterNote, loadStatus } = useNotes()
  const editorRef     = useRef(null)
  const statusSpanRef = useRef(null)

  const setStatus = useCallback((s) => {
    if (statusSpanRef.current) {
      statusSpanRef.current.textContent =
        s === 'saving' ? '⏳ Saving…' :
        s === 'saved'  ? '✓ Saved'   :
        s === 'error'  ? '⚠ Save failed' : ''
    }
  }, [])

  const chapterKey = `${book}-${chapter}`
  const prevKeyRef = useRef(null)

  // Force LTR on mount — belt-and-suspenders for contentEditable bidi
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', 'ltr')
      editorRef.current.style.direction = 'ltr'
      editorRef.current.style.textAlign = 'left'
      editorRef.current.style.unicodeBidi = 'plaintext'
    }
  }, [])

  useEffect(() => {
    if (loadStatus !== 'ready') return
    if (!editorRef.current) return
    const content = getChapterNote(book, chapter)
    editorRef.current.innerHTML = content
    // Re-enforce LTR after innerHTML replacement (browsers can reset dir)
    editorRef.current.setAttribute('dir', 'ltr')
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
      <>
        <div className="cn-header">
          <span className="cn-header__label">Chapter Notes</span>
        </div>
        <div className="notes-empty">
          <span className="notes-empty__icon">🔒</span>
          <p>Sign in to save chapter notes</p>
        </div>
      </>
    )
  }

  if (loadStatus === 'loading') {
    return (
      <>
        <div className="cn-header">
          <span className="cn-header__label">Chapter Notes</span>
        </div>
        <div className="notes-empty">
          <span className="notes-empty__icon" style={{ fontSize: 20 }}>⏳</span>
          <p style={{ fontSize: 12 }}>Loading notes…</p>
        </div>
      </>
    )
  }

  return (
    <div className="verse-notes" dir="ltr" onClick={() => editorRef.current?.focus()}>
      {/* Header row: label left, toolbar right */}
      <div className="cn-header">
        <span className="cn-header__label">Chapter Notes</span>
        <div className="cn-header__toolbar">
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
      </div>

      {/* Editor body */}
      <div
        ref={editorRef}
        className="verse-notes__editor cn-editor"
        contentEditable
        dir="ltr"
        lang="en"
        onInput={handleInput}
        onKeyDown={stopGameKeys}
        data-placeholder="Write your chapter notes here…"
        suppressContentEditableWarning
        role="textbox"
        aria-label="Chapter notes editor"
        aria-multiline="true"
      />
    </div>
  )
}
