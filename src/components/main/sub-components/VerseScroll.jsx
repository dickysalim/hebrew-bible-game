import { getLetterTypes, LETTER_SBL } from '../../../utils/hebrewData'
import RootFlag from './RootFlag'
import { useRef, useState, useEffect, useLayoutEffect } from 'react'

/**
 * VerseScroll
 *
 * Two independent behaviours:
 *
 * 1. VERSE TRANSITION — quick slide-out / slide-in animation when currentVerse
 *    changes. A "displayedVerse" state lags behind so the old content exits
 *    before the new content enters.
 *
 * 2. WORD-ROW CENTERING — the row that contains the active word is always
 *    centred vertically inside the scroll viewport. We measure the active
 *    word-block's offsetTop relative to the scroll-track, then apply a
 *    translateY on verse-inner-wrap so that word line sits at 50% height.
 */

const EXIT_MS  = 140   // exit animation duration
const ENTER_MS = 220   // enter animation duration

export default function VerseScroll({ verses, currentVerse, activeWordIdx, typedCounts, activeRootFlags, dispatch, showSBLWord, showSBLLetter, showGloss, expertMode }) {
  // --- verse transition state ---
  const [displayedVerse, setDisplayedVerse] = useState(currentVerse)
  const [animState, setAnimState]           = useState('')
  const prevVerseRef = useRef(currentVerse)
  const timerRef     = useRef(null)

  // --- centering refs ---
  const trackRef = useRef(null)   // .scroll-track — the clipping viewport
  const wrapRef  = useRef(null)   // .verse-inner-wrap — the element we translate
  const wordRefs = useRef([])     // individual word-block refs
  // True on first layout after mount or verse change — suppresses the CSS transition
  // so the initial position snaps in instead of animating from y=0.
  const isFirstLayoutRef = useRef(true)

  // ── Verse transition ──────────────────────────────────────────────────────
  useEffect(() => {
    if (currentVerse === prevVerseRef.current) return

    const dir = currentVerse > prevVerseRef.current ? 'up' : 'down'
    prevVerseRef.current = currentVerse

    clearTimeout(timerRef.current)
    setAnimState(`exit-${dir}`)

    timerRef.current = setTimeout(() => {
      // New verse — next centering layout should also snap instantly
      isFirstLayoutRef.current = true
      setDisplayedVerse(currentVerse)
      setAnimState(`enter-${dir}`)

      timerRef.current = setTimeout(() => {
        setAnimState('')
      }, ENTER_MS)
    }, EXIT_MS)

    return () => clearTimeout(timerRef.current)
  }, [currentVerse])

  // ── Word-row centering ────────────────────────────────────────────────────
  // Tracks the scroll-track's measured height so the centering re-runs
  // whenever it changes (e.g. when the mobile keyboard panel is added).
  const [trackHeight, setTrackHeight] = useState(0)
  useEffect(() => {
    if (!trackRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setTrackHeight(Math.round(entry.contentRect.height))
    })
    obs.observe(trackRef.current)
    return () => obs.disconnect()
  }, [])

  // useLayoutEffect so the transform is applied before paint (no visible jump)
  useLayoutEffect(() => {
    if (!trackRef.current || !wrapRef.current) return

    const trackH = trackRef.current.offsetHeight
    if (trackH === 0) return

    // Snap without transition on first layout after mount or verse change
    if (isFirstLayoutRef.current) {
      wrapRef.current.classList.add('verse-inner-wrap--instant')
    }

    // If nothing selected, center the top of the wrap
    if (activeWordIdx === null) {
      wrapRef.current.style.transform = `translateY(0px)`
    } else {
      const wordEl = wordRefs.current[activeWordIdx]
      if (wordEl) {
        // offsetTop is measured from the nearest positioned ancestor.
        // .scroll-track has position:relative, so offsetTop is relative to it.
        const wordTop    = wordEl.offsetTop
        const wordHeight = wordEl.offsetHeight

        // Desired: centre of word row == centre of track
        // On mobile, nudge 20px upward so the word doesn't feel too low
        const mobileOffset = window.matchMedia('(max-width: 640px)').matches ? 45 : 0
        const ty = Math.round(trackH / 2 - (wordTop + wordHeight / 2) - mobileOffset)
        wrapRef.current.style.transform = `translateY(${ty}px)`
      }
    }

    // Remove the instant class after one frame so future movements animate
    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false
      requestAnimationFrame(() => {
        if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')
      })
    }
  }, [activeWordIdx, displayedVerse, typedCounts, trackHeight])

  const verse = verses[displayedVerse]
  const currentVerseFlags = activeRootFlags?.filter(f => f.verseIndex === displayedVerse) || []

  // ── Mobile drag-to-read + flick-to-navigate ──────────────────────────────
  const touchStartRef = useRef(null)

  // Read the current translateY from the wrapper's inline style
  const getWrapY = () => {
    if (!wrapRef.current) return 0
    const m = wrapRef.current.style.transform.match(/translateY\((-?[\d.]+)px\)/)
    return m ? parseFloat(m[1]) : 0
  }

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    // Freeze position — disable CSS transition during drag
    if (wrapRef.current) wrapRef.current.classList.add('verse-inner-wrap--instant')
    touchStartRef.current = {
      x:        t.clientX,
      y:        t.clientY,
      baseY:    getWrapY(),
      lastY:    t.clientY,
      lastTime: Date.now(),
      velocity: 0,
    }
  }

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || e.touches.length !== 1) return
    const t  = e.touches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y

    // Abort if clearly horizontal
    if (Math.abs(dx) > Math.abs(dy) + 10) return

    // Move the wrapper live, clamped to ±80px from the centered base position
    if (wrapRef.current) {
      const raw     = touchStartRef.current.baseY + dy
      const clamped = Math.max(
        touchStartRef.current.baseY - 80,
        Math.min(touchStartRef.current.baseY + 80, raw)
      )
      wrapRef.current.style.transform = `translateY(${clamped}px)`
    }

    // Update instantaneous velocity (px/ms)
    const now = Date.now()
    const dt  = now - touchStartRef.current.lastTime
    if (dt > 0) {
      touchStartRef.current.velocity = (t.clientY - touchStartRef.current.lastY) / dt
      touchStartRef.current.lastY    = t.clientY
      touchStartRef.current.lastTime = now
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return
    const t        = e.changedTouches[0]
    const dy       = t.clientY - touchStartRef.current.y
    const velocity = touchStartRef.current.velocity
    touchStartRef.current = null

    const VELOCITY_THRESHOLD = 0.4  // px/ms — only a quick flick navigates verses
    const isFlick = Math.abs(velocity) > VELOCITY_THRESHOLD

    // Re-enable CSS transition
    if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')

    if (isFlick && dispatch) {
      // Swipe up (dy < 0) → next verse; swipe down (dy > 0) → prev verse
      dispatch({ type: 'MOVE_VERSE', dir: dy < 0 ? 1 : -1 })
    }
    // Slow drag: content stays at dragged position.
    // Centering snaps back automatically when activeWordIdx changes (Next Word / word click).
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')
  }

  return (
    <div
      className="scroll-track"
      ref={trackRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div className={`active-verse-container ${animState}`}>
        <ActiveVerseWords
          verse={verse}
          vi={displayedVerse}
          activeWordIdx={activeWordIdx}
          typedCounts={typedCounts}
          currentVerseFlags={currentVerseFlags}
          dispatch={dispatch}
          wrapRef={wrapRef}
          wordRefs={wordRefs}
          showSBLWord={showSBLWord}
          showSBLLetter={showSBLLetter}
          showGloss={showGloss}
          expertMode={expertMode}
        />
      </div>
    </div>
  )
}

function ActiveVerseWords({ verse, vi, activeWordIdx, typedCounts, currentVerseFlags, dispatch, wrapRef, wordRefs, showSBLWord, showSBLLetter, showGloss, expertMode }) {
  const handleFlagComplete = (flagIndex) => {
    if (dispatch) dispatch({ type: 'FLAG_COMPLETED', flagIndex })
  }

  // Find first incomplete word in this verse
  const firstIncomplete = verse.words.findIndex((word, wi) => {
    const typed = typedCounts[`${vi}-${wi}`] ?? 0
    return typed < word.id.length
  })

  const handleWordClick = (wi) => {
    if (!dispatch) return
    
    const typed = typedCounts[`${vi}-${wi}`] ?? 0
    const done = typed >= verse.words[wi].id.length
    
    // Word is clickable if it's done OR it's the first incomplete word
    const isClickable = done || wi === firstIncomplete
    
    if (isClickable) {
      dispatch({ type: 'SELECT_WORD', wordIndex: wi })
    }
  }

  return (
    <div className="verse-inner-wrap" ref={wrapRef}>
      {verse.words.map((word, wi) => {
        const letters  = word.id.split('')
        const typed    = typedCounts[`${vi}-${wi}`] ?? 0
        const done     = typed >= letters.length
        const isActive = wi === activeWordIdx
        const types    = getLetterTypes(word.id)
        
        // Determine if word is clickable
        const isClickable = done || wi === firstIncomplete

        const wordFlags = currentVerseFlags.filter(f => f.wordIndex === wi)

        return (
          <div
            key={wi}
            className={`word-block ${isActive ? 'active-word' : ''} ${done ? 'done-word' : ''} ${isClickable ? 'clickable-word' : ''}`}
            ref={el => { wordRefs.current[wi] = el }}
            onClick={() => handleWordClick(wi)}
          >
            {/* Per-letter columns */}
            <div className="word-letter-cols">
              {letters.map((ch, i) => {
                const isTyped = i < typed
                const type    = types[i] || 'root'
                const charCls = done ? 'done' : isTyped ? `typed type-${type}` : 'ghost'

                // Expert mode: ghost chars invisible, SBL Letter forced off
                const effectiveSBLLetter = expertMode ? false : showSBLLetter
                const ghostStyle = expertMode && !isTyped && !done ? { opacity: 0 } : undefined

                return (
                  <div key={i} className="word-letter-col">
                    <span className={`word-char ${charCls}`} style={ghostStyle}>{ch}</span>
                    {effectiveSBLLetter && (
                      <span className={`word-sbl-ch ${(isTyped || done) ? 'visible' : ''}`}>
                        {(isTyped || done) ? (LETTER_SBL[ch] || '') : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Full word SBL — shown when done (always), or during typing in expert mode */}
            {(() => {
              const effectiveSBLWord = expertMode ? true : showSBLWord
              const showForActive = expertMode && isActive && !done
              return (done || showForActive) && effectiveSBLWord
                ? <div className="word-full-sbl">{word.sbl}</div>
                : null
            })()}

            {/* Gloss — shown only when word is done and toggle is on; not affected by expert mode */}
            {done && showGloss && word.gloss && (
              <div className="word-gloss">{word.gloss}</div>
            )}

            {/* Root flags */}
            {wordFlags.map((flag, flagIndex) => {
              const LETTER_W = 23
              const PADDING  = 6
              const rootCenterFromRight = PADDING + (flag.rootStartIdx + (flag.rootEndIdx - flag.rootStartIdx) / 2) * LETTER_W
              const wordWidth = PADDING * 2 + letters.length * LETTER_W
              const style = { left: `${wordWidth - rootCenterFromRight}px` }

              return (
                <RootFlag
                  key={`${flag.rootId}-${flag.timestamp}`}
                  flagData={flag}
                  onHide={() => handleFlagComplete(flagIndex)}
                  style={style}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
