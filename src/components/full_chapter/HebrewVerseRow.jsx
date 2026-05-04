import { memo } from 'react'
import { LETTER_SBL } from '../../utils/hebrewData'

/** Check if all words of a verse are typed (completed) based on typedCounts. */
function isVerseCompleted(verse, verseIdx, typedCounts) {
  if (!verse?.words) return false
  return verse.words.every((word, wi) => {
    const typed = typedCounts[`${verseIdx}-${wi}`] ?? 0
    return typed >= word.id.length
  })
}

function HebrewVerseRow({ verse, verseIdx, typedCounts, showSBLWord, showSBLLetter, showGloss }) {
  const allDone = isVerseCompleted(verse, verseIdx, typedCounts)

  return (
    <div
      className={`fc-verse-row ${allDone ? 'fc-verse-row--done' : ''}`}
      id={`fc-v${verseIdx}`}
    >
      {/* Verse number in its own fixed column — never competes with word wrapping */}
      <div className="fc-verse-num-col">
        <span className="fc-verse-num" aria-label={`Verse ${verse.verse}`}>{verse.verse}</span>
      </div>

      {/* RTL word container — wraps independently of the verse number */}
      <div className="fc-verse-content" dir="rtl" lang="he">
        {/* Word tokens — inline-flex columns, gap controlled via CSS */}
        {verse.words.map((word, wi) => {
          const letters = word.id.split('')
          const typed = typedCounts[`${verseIdx}-${wi}`] ?? 0
          const done = typed >= letters.length

          return (
            <span key={wi} className={`fc-word ${done ? 'fc-word--done' : ''}`}>
              {/* Letter columns — Hebrew char + optional SBL Letter below */}
              <span className="fc-word__letters">
                {letters.map((ch, i) => {
                  const isTyped = i < typed
                  return (
                    <span key={i} className="fc-letter-col">
                      <span className={`fc-heb-char ${done ? 'done' : isTyped ? 'typed' : 'ghost'}`}>
                        {ch}
                      </span>
                      {showSBLLetter && (
                        <span className={`fc-sbl-ch ${(isTyped || done) ? 'visible' : ''}`}>
                          {(isTyped || done) ? (LETTER_SBL[ch] || '') : ''}
                        </span>
                      )}
                    </span>
                  )
                })}
              </span>

              {/* Full word SBL — shown when word is done */}
              {showSBLWord && done && (
                <span className="fc-word__sbl">{word.sbl}</span>
              )}

              {/* Inline TAHOT gloss — shown under each word when toggle is on */}
              {showGloss && (
                <span className={`fc-word__gloss ${done ? 'fc-word__gloss--done' : ''}`}>
                  {word.gloss || word.id}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default memo(HebrewVerseRow)
