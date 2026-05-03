import { useState, useEffect, useRef, useCallback } from 'react'
import { loadNote, saveNote } from '../../../lib/notes'

/**
 * VerseNotesTab — rich-text (B/I/U only) note editor for the active verse.
 *
 * Persists to Supabase `verse_notes` table, auto-saves 1s after the user
 * stops typing. Content is stored as HTML.
 */
export default function VerseNotesTab({ userId, book, chapter, verse }) {
  const editorRef = useRef(null)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [isLoading, setIsLoading] = useState(true)
  const [showEmpty, setShowEmpty] = useState(false)
  const debounceRef = useRef(null)
  const currentKeyRef = useRef('')

  const verseKey = `${book}-${chapter}-${verse}`

  // Load note when verse changes
  useEffect(() => {
    if (!userId || !book) return
    currentKeyRef.current = verseKey
    setSaveStatus('idle')
    setIsLoading(true)
    setShowEmpty(false)

    // Clear any pending save from the previous verse
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    loadNote(userId, book.toLowerCase(), chapter, verse).then(content => {
      if (currentKeyRef.current !== verseKey) return // stale response
      const hasContent = content && content.replace(/<[^>]*>/g, '').trim() !== ''
      if (editorRef.current) {
        editorRef.current.innerHTML = content || ''
      }
      setShowEmpty(!hasContent)
      setIsLoading(false)
    })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [userId, verseKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = useCallback(() => {
    if (!userId || !book) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('idle')

    debounceRef.current = setTimeout(async () => {
      const content = editorRef.current?.innerHTML || ''
      setSaveStatus('saving')
      const ok = await saveNote(userId, book.toLowerCase(), chapter, verse, content)
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) {
        setTimeout(() => setSaveStatus(prev => (prev === 'saved' ? 'idle' : prev)), 2000)
      }
    }, 1000)
  }, [userId, book, chapter, verse])

  // Format commands — use onMouseDown + preventDefault to keep editor focus
  const execFormat = (cmd) => {
    document.execCommand(cmd)
    editorRef.current?.focus()
  }

  // Block game keyboard from intercepting while typing in the editor
  const stopGameKeys = (e) => {
    e.stopPropagation()

    // Tab → insert indent (4 spaces), Shift+Tab → outdent
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        document.execCommand('outdent')
      } else {
        document.execCommand('insertText', false, '    ')
      }
    }
  }

  // "Start Writing" — dismiss empty state and focus editor
  const handleStartWriting = () => {
    setShowEmpty(false)
    requestAnimationFrame(() => {
      editorRef.current?.focus()
    })
  }

  if (!userId) {
    return (
      <div className="notes-empty">
        <span className="notes-empty__icon">🔒</span>
        <p>Sign in to save verse notes</p>
      </div>
    )
  }

  return (
    <div className="verse-notes">
      {/* Empty state — shown when no notes exist for this verse */}
      {showEmpty && !isLoading && (
        <div className="notes-empty">
          <span className="notes-empty__icon">✏️</span>
          <p className="notes-empty__title">Take Notes on This Verse</p>
          <p className="notes-empty__desc">
            Capture insights, cross-references, or questions as you study.
          </p>
          <button className="notes-empty__btn" onClick={handleStartWriting}>
            Start Writing
          </button>
        </div>
      )}

      {/* Editor — hidden behind empty state until user clicks Start Writing */}
      <div
        className="verse-notes__inner"
        style={showEmpty && !isLoading ? { display: 'none' } : undefined}
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

          <span className="verse-notes__status" aria-live="polite">
            {isLoading && '⏳ Loading…'}
            {saveStatus === 'saving' && '⏳ Saving…'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && '⚠ Save failed'}
          </span>
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
