import { useState } from 'react'
import ChapterDropdownBar from './ChapterDropdownBar'
import HebrewVerseRow from './HebrewVerseRow'

export default function RightPanel({ verses, chapterMeta, typedCounts, selectedStageIndex, onSelect, completedStageIndexes }) {
  const [showSBLWord,   setShowSBLWord]   = useState(true)
  const [showSBLLetter, setShowSBLLetter] = useState(true)
  const [showGloss,     setShowGloss]     = useState(true)
  const [fontSize,      setFontSize]      = useState(24) // px, 18–36 step 2

  const decSize = () => setFontSize(s => Math.max(18, s - 2))
  const incSize = () => setFontSize(s => Math.min(36, s + 2))

  return (
    <div className="fc-right">
      {/* Controls bar — dropdown on left, toggles on right */}
      <div className="fc-right__toolbar">
        <ChapterDropdownBar
          selectedStageIndex={selectedStageIndex}
          onSelect={onSelect}
          completedStageIndexes={completedStageIndexes}
        />
        <div className="fc-right__toggles">
          {/* Font size control */}
          <div className="fc-font-size" aria-label="Hebrew font size">
            <button
              className="fc-font-size__btn"
              onClick={decSize}
              disabled={fontSize <= 18}
              aria-label="Decrease font size"
              title="Smaller"
            >A−</button>
            <button
              className="fc-font-size__btn"
              onClick={incSize}
              disabled={fontSize >= 36}
              aria-label="Increase font size"
              title="Larger"
            >A+</button>
          </div>

          <div className="fc-right__toggles-sep" aria-hidden="true" />

          <label className="fc-toggle">
            <input
              type="checkbox"
              id="fc-toggle-gloss"
              checked={showGloss}
              onChange={e => setShowGloss(e.target.checked)}
            />
            <span>Gloss</span>
          </label>
          <label className="fc-toggle">
            <input
              type="checkbox"
              id="fc-toggle-sbl-letter"
              checked={showSBLLetter}
              onChange={e => setShowSBLLetter(e.target.checked)}
            />
            <span>SBL Letter</span>
          </label>
          <label className="fc-toggle">
            <input
              type="checkbox"
              id="fc-toggle-sbl-word"
              checked={showSBLWord}
              onChange={e => setShowSBLWord(e.target.checked)}
            />
            <span>SBL Word</span>
          </label>
        </div>
      </div>

      {/* Scrollable text body — CSS var drives all Hebrew sizing */}
      <div
        className="fc-right__scroll"
        role="document"
        aria-label="Hebrew chapter text"
        style={{ '--fc-heb-size': `${fontSize}px` }}
      >
        {verses.map((verse, vi) => (
          <HebrewVerseRow
            key={vi}
            verse={verse}
            verseIdx={vi}
            typedCounts={typedCounts}
            showSBLWord={showSBLWord}
            showSBLLetter={showSBLLetter}
            showGloss={showGloss}
          />
        ))}
        <div className="fc-right__footer">
          {chapterMeta ? `${chapterMeta.book} ${chapterMeta.chapter} — Masoretic Text (BHS) — TAHOT Gloss` : ''}
        </div>
      </div>
    </div>
  )
}
