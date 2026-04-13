import { useRef, useEffect } from 'react'
import { getLetterTypes, LETTER_SBL } from '../utils/hebrewData'

const TRACK_H = 260
const ACTIVE_H = 200
const ADJ_H    = 12

export default function VerseScroll({ verses, currentVerse, activeWordIdx, typedCounts }) {
  const innerRef = useRef(null)
  const prevVerse = useRef(currentVerse)

  // Animated on verse change
  useEffect(() => {
    if (!innerRef.current) return
    const animate = prevVerse.current !== currentVerse
    prevVerse.current = currentVerse
    const ty = (TRACK_H / 2) - (ACTIVE_H / 2) - currentVerse * ADJ_H
    innerRef.current.style.transition = animate
      ? 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none'
    innerRef.current.style.transform = `translateY(${ty}px)`
  }, [currentVerse])

  // No-animation initial position
  useEffect(() => {
    if (!innerRef.current) return
    const ty = (TRACK_H / 2) - (ACTIVE_H / 2) - currentVerse * ADJ_H
    innerRef.current.style.transition = 'none'
    innerRef.current.style.transform = `translateY(${ty}px)`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

function ActiveVerseWords({ verse, vi, activeWordIdx, typedCounts }) {
  return (
    <div className="verse-inner-wrap">
      {verse.words.map((word, wi) => {
        const letters = word.id.split('')
        const typed   = typedCounts[`${vi}-${wi}`] ?? 0
        const done    = typed >= letters.length
        const isActive = wi === activeWordIdx
        const types   = getLetterTypes(word.id)

        return (
          <div
            key={wi}
            className={`word-block ${isActive ? 'active-word' : ''} ${done ? 'done-word' : ''}`}
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
