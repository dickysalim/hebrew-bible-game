import { getLetterTypes, LETTER_SBL } from '../../../utils/hebrewData'
import RootFlag from './RootFlag'
import { useRef } from 'react'

export default function VerseScroll({ verses, currentVerse, activeWordIdx, typedCounts, activeRootFlags, dispatch }) {
  const verse = verses[currentVerse]

  // Filter flags for current verse only
  const currentVerseFlags = activeRootFlags?.filter(flag => flag.verseIndex === currentVerse) || []

  return (
    <div className="scroll-track">
      <div className="verse-slot active">
        <ActiveVerseWords
          verse={verse}
          vi={currentVerse}
          activeWordIdx={activeWordIdx}
          typedCounts={typedCounts}
          currentVerseFlags={currentVerseFlags}
          dispatch={dispatch}
        />
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

