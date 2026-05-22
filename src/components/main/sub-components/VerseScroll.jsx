import { getLetterTypes, LETTER_SBL, splitNikudGroups } from '../../../utils/hebrewData'
import { useRef, useState, useEffect, useLayoutEffect } from 'react'

const EXIT_MS  = 140
const ENTER_MS = 220

export default function VerseScroll({ verses, currentWordOrder, highestWordOrder, typedChars, dispatch, showSBLWord, showSBLLetter, showGloss, showNikud, expertMode }) {
  const currentVerseIdx = verses.findIndex(v => v.words.some(w => w.word_order === currentWordOrder))
  const activeWordIdx = currentVerseIdx >= 0
    ? verses[currentVerseIdx].words.findIndex(w => w.word_order === currentWordOrder)
    : -1

  // --- verse transition state ---
  const [displayedVerse, setDisplayedVerse] = useState(currentVerseIdx)
  const [animState, setAnimState]           = useState('')
  const prevVerseRef = useRef(currentVerseIdx)
  const timerRef     = useRef(null)

  // --- centering refs ---
  const trackRef = useRef(null)
  const wrapRef  = useRef(null)
  const wordRefs = useRef([])
  const isFirstLayoutRef = useRef(true)

  // ── Verse transition ──────────────────────────────────────────────────────
  useEffect(() => {
    if (currentVerseIdx === prevVerseRef.current) return

    const dir = currentVerseIdx > prevVerseRef.current ? 'up' : 'down'
    prevVerseRef.current = currentVerseIdx

    clearTimeout(timerRef.current)
    setAnimState(`exit-${dir}`)

    timerRef.current = setTimeout(() => {
      isFirstLayoutRef.current = true
      setDisplayedVerse(currentVerseIdx)
      setAnimState(`enter-${dir}`)

      timerRef.current = setTimeout(() => {
        setAnimState('')
      }, ENTER_MS)
    }, EXIT_MS)

    return () => clearTimeout(timerRef.current)
  }, [currentVerseIdx])

  // ── Word-row centering ────────────────────────────────────────────────────
  const [trackHeight, setTrackHeight] = useState(0)
  useEffect(() => {
    if (!trackRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setTrackHeight(Math.round(entry.contentRect.height))
    })
    obs.observe(trackRef.current)
    return () => obs.disconnect()
  }, [])

  const derivedActiveWordIdx = displayedVerse === currentVerseIdx ? activeWordIdx : -1

  useLayoutEffect(() => {
    if (!trackRef.current || !wrapRef.current) return

    const trackH = trackRef.current.offsetHeight
    if (trackH === 0) return

    if (isFirstLayoutRef.current) {
      wrapRef.current.classList.add('verse-inner-wrap--instant')
    }

    if (derivedActiveWordIdx === -1) {
      wrapRef.current.style.transform = `translateY(0px)`
    } else {
      const wordEl = wordRefs.current[derivedActiveWordIdx]
      if (wordEl) {
        const wordTop    = wordEl.offsetTop
        const wordHeight = wordEl.offsetHeight
        const mobileOffset = window.matchMedia('(max-width: 640px)').matches ? 45 : 0
        const ty = Math.round(trackH / 2 - (wordTop + wordHeight / 2) - mobileOffset)
        wrapRef.current.style.transform = `translateY(${ty}px)`
      }
    }

    if (isFirstLayoutRef.current) {
      isFirstLayoutRef.current = false
      requestAnimationFrame(() => {
        if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')
      })
    }
  }, [derivedActiveWordIdx, displayedVerse, typedChars, highestWordOrder, trackHeight])

  const verse = verses[displayedVerse] ?? verses[currentVerseIdx] ?? null

  // ── Mobile drag-to-read + flick-to-navigate ──────────────────────────────
  const touchStartRef = useRef(null)

  const getWrapY = () => {
    if (!wrapRef.current) return 0
    const m = wrapRef.current.style.transform.match(/translateY\((-?[\d.]+)px\)/)
    return m ? parseFloat(m[1]) : 0
  }

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
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

    if (Math.abs(dx) > Math.abs(dy) + 10) return

    if (wrapRef.current) {
      const raw     = touchStartRef.current.baseY + dy
      const clamped = Math.max(
        touchStartRef.current.baseY - 80,
        Math.min(touchStartRef.current.baseY + 80, raw)
      )
      wrapRef.current.style.transform = `translateY(${clamped}px)`
    }

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

    const VELOCITY_THRESHOLD = 0.4
    const isFlick = Math.abs(velocity) > VELOCITY_THRESHOLD

    if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')

    if (isFlick && dispatch) {
      dispatch({ type: 'MOVE_VERSE', dir: dy < 0 ? 1 : -1 })
    }
  }

  const handleTouchCancel = () => {
    touchStartRef.current = null
    if (wrapRef.current) wrapRef.current.classList.remove('verse-inner-wrap--instant')
  }

  if (!verse) return null

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
          currentWordOrder={currentWordOrder}
          highestWordOrder={highestWordOrder}
          typedChars={typedChars}
          dispatch={dispatch}
          wrapRef={wrapRef}
          wordRefs={wordRefs}
          showSBLWord={showSBLWord}
          showSBLLetter={showSBLLetter}
          showGloss={showGloss}
          showNikud={showNikud}
          expertMode={expertMode}
        />
      </div>
    </div>
  )
}

function ActiveVerseWords({ verse, currentWordOrder, highestWordOrder, typedChars, dispatch, wrapRef, wordRefs, showSBLWord, showSBLLetter, showGloss, showNikud, expertMode }) {
  return (
    <div className="verse-inner-wrap" ref={wrapRef}>
      {verse.words.map((word, wi) => {
        const consonants = word.heb_consonant.split('')
        const nikudGroups = showNikud && word.heb_nikud
          ? splitNikudGroups(word.heb_nikud)
          : null
        const displayLetters = (nikudGroups && nikudGroups.length === consonants.length)
          ? nikudGroups
          : consonants
        const isComplete = word.word_order <= highestWordOrder
        const isCurrentWord = word.word_order === currentWordOrder
        const typed = isComplete ? consonants.length
                    : isCurrentWord ? typedChars
                    : 0
        const done = isComplete
        const isActive = isCurrentWord
        const types = getLetterTypes(word.heb_consonant)

        const canSelect = word.word_order <= highestWordOrder + 1

        return (
          <div
            key={wi}
            className={`word-block ${isActive ? 'active-word' : ''} ${done ? 'done-word' : ''}${canSelect && !isActive ? ' word-block--selectable' : ''}`}
            ref={el => { wordRefs.current[wi] = el }}
            onClick={canSelect && !isActive ? () => dispatch({ type: 'SELECT_WORD', wordOrder: word.word_order }) : undefined}
          >
            {/* Per-letter columns */}
            <div className="word-letter-cols">
              {displayLetters.map((displayCh, i) => {
                const isTyped = i < typed
                const type    = types[i] || 'root'
                const charCls = done ? 'done' : isTyped ? `typed type-${type}` : 'ghost'

                const effectiveSBLLetter = expertMode ? false : showSBLLetter
                const ghostStyle = expertMode && !isTyped && !done ? { opacity: 0 } : undefined

                return (
                  <div key={i} className={`word-letter-col${nikudGroups ? ' word-letter-col--nikud' : ''}`}>
                    <span className={`word-char ${charCls}`} style={ghostStyle}>{displayCh}</span>
                    {effectiveSBLLetter && (
                      <span className={`word-sbl-ch ${(isTyped || done) ? 'visible' : ''}`}>
                        {(isTyped || done) ? (LETTER_SBL[consonants[i]] || '') : ''}
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
          </div>
        )
      })}
    </div>
  )
}
