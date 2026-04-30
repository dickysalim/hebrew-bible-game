import { useEffect, useRef } from 'react'
import WordDefTabs from './WordDefTabs'

export default function WordDefSheet({
  open,
  onClose,
  word,
  wordId,
  sbl,
  encounterCount,
  isWordCompleted,
  onOpenHaber,
  isWordNew,
}) {
  const overlayRef = useRef(null)

  // Close when tapping the backdrop (not the sheet itself)
  useEffect(() => {
    if (!open) return
    const el = overlayRef.current
    if (!el) return
    const handler = (e) => {
      if (e.target === el) onClose()
    }
    el.addEventListener('pointerdown', handler)
    return () => el.removeEventListener('pointerdown', handler)
  }, [open, onClose])

  // Prevent background scroll while sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      ref={overlayRef}
      className={`wds-overlay${open ? ' wds-overlay--open' : ''}`}
      aria-hidden={!open}
    >
      <div className={`wds-sheet${open ? ' wds-sheet--open' : ''}`}>
        <div className="wds-handle" onPointerDown={onClose} aria-label="Close" />
        <div className="wds-content">
          <WordDefTabs
            word={word}
            wordId={wordId}
            sbl={sbl}
            encounterCount={encounterCount}
            isWordCompleted={isWordCompleted}
            onOpenHaber={onOpenHaber}
            isWordNew={isWordNew}
          />
        </div>
      </div>
    </div>
  )
}
