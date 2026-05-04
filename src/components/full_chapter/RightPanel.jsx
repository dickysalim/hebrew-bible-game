import { useState, useEffect, useCallback } from 'react'
import ChapterDropdownBar from './ChapterDropdownBar'
import HebrewVerseRow from './HebrewVerseRow'
import { useProgressCache } from '../../contexts/ProgressCacheContext'

export default function RightPanel({ verses, chapterMeta, typedCounts, selectedStageIndex, onSelect, completedStageIndexes, userId }) {
  const { cachedProgress, updateFcSettings } = useProgressCache()

  // Initialise from persisted fcSettings (Supabase) if available, else sensible defaults
  const fc = cachedProgress?.fcSettings ?? {}
  const [showSBLWord,   setShowSBLWord]   = useState(() => fc.showSBLWord   ?? true)
  const [showSBLLetter, setShowSBLLetter] = useState(() => fc.showSBLLetter ?? true)
  const [showGloss,     setShowGloss]     = useState(() => fc.showGloss     ?? true)
  const [fontSize,      setFontSize]      = useState(() => fc.fontSize      ?? 24) // px, 18–36 step 2

  // Once Supabase data arrives (cachedProgress becomes non-null), hydrate settings.
  // This covers the case where the component mounts before the async load finishes.
  const hydratedRef = useState(false)
  useEffect(() => {
    if (hydratedRef[0] || !cachedProgress?.fcSettings) return
    hydratedRef[1](true)
    const saved = cachedProgress.fcSettings
    if (saved.showSBLWord   !== undefined) setShowSBLWord(saved.showSBLWord)
    if (saved.showSBLLetter !== undefined) setShowSBLLetter(saved.showSBLLetter)
    if (saved.showGloss     !== undefined) setShowGloss(saved.showGloss)
    if (saved.fontSize      !== undefined) setFontSize(saved.fontSize)
  }, [cachedProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist Full Chapter settings via dedicated updateFcSettings.
  // This only patches fcSettings in the cache — game progress is never touched.
  const persistFcSettings = useCallback((patch) => {
    if (!userId) return
    updateFcSettings(patch)
  }, [userId, updateFcSettings])

  const decSize = () => setFontSize(s => { const n = Math.max(18, s - 2); persistFcSettings({ fontSize: n }); return n })
  const incSize = () => setFontSize(s => { const n = Math.min(36, s + 2); persistFcSettings({ fontSize: n }); return n })

  const toggleGloss = (val) => { setShowGloss(val); persistFcSettings({ showGloss: val }) }
  const toggleSBLLetter = (val) => { setShowSBLLetter(val); persistFcSettings({ showSBLLetter: val }) }
  const toggleSBLWord = (val) => { setShowSBLWord(val); persistFcSettings({ showSBLWord: val }) }

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
              onChange={e => toggleGloss(e.target.checked)}
            />
            <span>Gloss</span>
          </label>
          <label className="fc-toggle">
            <input
              type="checkbox"
              id="fc-toggle-sbl-letter"
              checked={showSBLLetter}
              onChange={e => toggleSBLLetter(e.target.checked)}
            />
            <span>SBL Letter</span>
          </label>
          <label className="fc-toggle">
            <input
              type="checkbox"
              id="fc-toggle-sbl-word"
              checked={showSBLWord}
              onChange={e => toggleSBLWord(e.target.checked)}
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
