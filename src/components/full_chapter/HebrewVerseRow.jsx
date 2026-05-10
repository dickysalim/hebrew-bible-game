import { memo } from 'react'
import { LETTER_SBL } from '../../utils/hebrewData'

function HebrewVerseRow({ verse, verseIdx, showSBLWord, showSBLLetter, showGloss, onWordClick, selectedWordId }) {
  return (
    <div className="fc-verse-row fc-verse-row--done" id={`fc-v${verseIdx}`}>
      {/* Verse number in its own fixed column — never competes with word wrapping */}
      <div className="fc-verse-num-col">
        <span className="fc-verse-num" aria-label={`Verse ${verse.verse}`}>{verse.verse}</span>
      </div>

      {/* RTL word container — wraps independently of the verse number */}
      <div className="fc-verse-content" dir="rtl" lang="he">
        {verse.words.map((word, wi) => {
          const letters = word.id.split('')
          const isSelected = selectedWordId === word.id
          return (
            <button
              key={wi}
              className={`fc-word fc-word--done fc-word--clickable${isSelected ? ' fc-word--selected' : ''}`}
              onClick={() => onWordClick?.(word, verse)}
              aria-label={`${word.id} — ${word.gloss || ''}`}
              type="button"
            >
              {/* Letter columns — Hebrew char + optional SBL Letter below */}
              <span className="fc-word__letters">
                {letters.map((ch, i) => (
                  <span key={i} className="fc-letter-col">
                    <span className="fc-heb-char done">{ch}</span>
                    {showSBLLetter && (
                      <span className="fc-sbl-ch visible">
                        {LETTER_SBL[ch] || ''}
                      </span>
                    )}
                  </span>
                ))}
              </span>

              {/* Full word SBL — shown when toggle is on */}
              {showSBLWord && (
                <span className="fc-word__sbl">{word.sbl}</span>
              )}

              {/* Inline TAHOT gloss — shown under each word when toggle is on */}
              {showGloss && (
                <span className="fc-word__gloss fc-word__gloss--done">
                  {word.gloss || word.id}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(HebrewVerseRow)
