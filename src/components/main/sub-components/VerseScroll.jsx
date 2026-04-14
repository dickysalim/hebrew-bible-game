import { useRef, useLayoutEffect } from 'react'
import { getLetterTypes, LETTER_SBL } from '../../../utils/hebrewData'
import RootFlag from './RootFlag'

const TRACK_H = 300
const ACTIVE_H = 220
const ADJ_H    = 24

export default function VerseScroll({ verses, currentVerse, activeWordIdx, typedCounts, activeRootFlags, dispatch }) {
  const innerRef = useRef(null)
  const prevVerse = useRef(currentVerse)

  // Animated on verse change — useLayoutEffect fires before paint so heights
  // and transform are always in sync (no one-frame misalignment)
  useLayoutEffect(() => {
    if (!innerRef.current) return
    const animate = prevVerse.current !== currentVerse
    prevVerse.current = currentVerse
    const ty = (TRACK_H / 2) - (ACTIVE_H / 2) - currentVerse * ADJ_H
    innerRef.current.style.transition = animate
      ? 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none'
    innerRef.current.style.transform = `translateY(${ty}px)`
  }, [currentVerse])

  // No-animation initial position — also useLayoutEffect to prevent flash
  useLayoutEffect(() => {
    if (!innerRef.current) return
    const ty = (TRACK_H / 2) - (ACTIVE_H / 2) - currentVerse * ADJ_H
    innerRef.current.style.transition = 'none'
    innerRef.current.style.transform = `translateY(${ty}px)`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter flags for current verse
  const currentVerseFlags = activeRootFlags?.filter(flag => flag.verseIndex === currentVerse) || []

  return (
    <div className="scroll-track">
      <div className="scroll-inner" ref={innerRef}>
        {verses.map((verse, vi) => {
          const dist = Math.abs(vi - currentVerse)
          const slotClass = dist === 0 ? 'active' : dist === 1 ? 'adjacent' : 'hidden'
          return (
            <div key={vi} className={`verse-slot ${slotClass}`}>
              {dist === 0 && (
                <ActiveVerseWords
                  verse={verse}
                  vi={vi}
                  activeWordIdx={activeWordIdx}
                  typedCounts={typedCounts}
                  currentVerseFlags={currentVerseFlags}
                  dispatch={dispatch}
                />
              )}
              {dist === 1 && <PlainVerseWords verse={verse} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActiveVerseWords({ verse, vi, activeWordIdx, typedCounts, currentVerseFlags, dispatch }) {
  // Create refs for letter columns to calculate positions
  const wordRefs = useRef([])
  
  // Function to handle flag completion
  const handleFlagComplete = (flagIndex) => {
    if (dispatch) {
      dispatch({ type: 'FLAG_COMPLETED', flagIndex })
    }
  }

  return (
    <div className="verse-inner-wrap">
      {verse.words.map((word, wi) => {
        const letters = word.id.split('')
        const typed   = typedCounts[`${vi}-${wi}`] ?? 0
        const done    = typed >= letters.length
        const isActive = wi === activeWordIdx
        const types   = getLetterTypes(word.id)

        // Find flags for this specific word
        const wordFlags = currentVerseFlags.filter(flag => flag.wordIndex === wi)

        return (
          <div
            key={wi}
            className={`word-block ${isActive ? 'active-word' : ''} ${done ? 'done-word' : ''}`}
            ref={el => wordRefs.current[wi] = el}
          >
            {/* Per-letter columns: Hebrew glyph stacked above its SBL sound */}
            <div className="word-letter-cols">
              {letters.map((ch, i) => {
                const isTyped = i < typed
                const type = types[i] || 'root'
                const charCls = done
                  ? 'done'
                  : isTyped
                    ? `typed type-${type}`
                    : 'ghost'

                return (
                  <div key={i} className="word-letter-col">
                    <span className={`word-char ${charCls}`}>{ch}</span>
                    <span className={`word-sbl-ch ${isTyped || done ? 'visible' : ''}`}>
                      {(isTyped || done) ? (LETTER_SBL[ch] || '') : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Full word SBL — appears only when word is done */}
            {done && (
              <div className="word-full-sbl">{word.sbl}</div>
            )}

            {/* Render root flags for this word — positioned over the root letters */}
            {wordFlags.map((flag, flagIndex) => {
              // Calculate the center of the root letter range within the word-block.
              // word-letter-col has min-width: 22px + 1px gap; word-block has 6px padding each side.
              // RTL: letters are laid out right-to-left, so rootStart=0 is the rightmost letter.
              // We offset from the right edge using padding + letter widths.
              const LETTER_W = 23 // 22px min-width + 1px gap
              const PADDING  = 6  // word-block padding-left/right
              const totalLetters = letters.length
              const rootStart = flag.rootStartIdx
              const rootEnd   = flag.rootEndIdx
              // Center of root segment, measured from the right (RTL)
              const rootCenterFromRight = PADDING + (rootStart + (rootEnd - rootStart) / 2) * LETTER_W
              // Convert to left offset: total word width minus right-offset
              const wordWidth = PADDING * 2 + totalLetters * LETTER_W
              const leftOffset = wordWidth - rootCenterFromRight

              const style = {
                left: `${leftOffset}px`,
              }

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

function PlainVerseWords({ verse }) {
  return (
    <div className="verse-inner-wrap">
      <div className="verse-plain">{verse.words.map(w => w.id).join(' ')}</div>
    </div>
  )
}
