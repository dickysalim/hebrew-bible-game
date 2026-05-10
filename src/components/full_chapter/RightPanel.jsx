import { useState, useEffect, useCallback } from 'react'
import ChapterDropdownBar from './ChapterDropdownBar'
import HebrewVerseRow from './HebrewVerseRow'
import { CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { getWord } from '../../lib/lexiconCache'
import WordDefSheet from '../main/sub-components/WordDefSheet'

export default function RightPanel({ verses, chapterMeta, selectedStageIndex, onSelect, completedStageIndexes, userId, selectedWord, onWordClick, onCloseWord, lemmaMap }) {
  const { cachedProgress, updateFcSettings } = useProgressCache()

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

  const [fcCustomizeOpen, setFcCustomizeOpen] = useState(false)

  // Book/chapter derived for mobile selects
  const REGISTRY_BOOKS = [...new Set(CHAPTER_REGISTRY.map(e => e.book))]
  const selectedEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === selectedStageIndex)
  const [selectedBook, setSelectedBook] = useState(selectedEntry?.book ?? REGISTRY_BOOKS[0])
  const isAccessible = (si) => completedStageIndexes.has(si)
  const chaptersForBook = CHAPTER_REGISTRY.filter(e => e.book === selectedBook)
  const bookHasProgress = (book) => CHAPTER_REGISTRY.some(e => e.book === book && isAccessible(e.stageIndex))

  const handleMobileBookChange = (e) => {
    const book = e.target.value
    setSelectedBook(book)
    const first = CHAPTER_REGISTRY.filter(c => c.book === book).find(c => isAccessible(c.stageIndex))
    if (first) onSelect(first.stageIndex)
  }
  const handleMobileChapterChange = (e) => {
    const si = Number(e.target.value)
    if (isAccessible(si)) onSelect(si)
  }

  return (
    <div className="fc-right">
      {/* Desktop toolbar — hidden on mobile via CSS */}
      <div className="fc-right__toolbar">
        <ChapterDropdownBar
          selectedStageIndex={selectedStageIndex}
          onSelect={onSelect}
          completedStageIndexes={completedStageIndexes}
        />
        <div className="fc-right__toggles">
          <div className="fc-font-size" aria-label="Hebrew font size">
            <button className="fc-font-size__btn" onClick={decSize} disabled={fontSize <= 18} aria-label="Decrease font size" title="Smaller">A−</button>
            <button className="fc-font-size__btn" onClick={incSize} disabled={fontSize >= 36} aria-label="Increase font size" title="Larger">A+</button>
          </div>
          <div className="fc-right__toggles-sep" aria-hidden="true" />
          <label className="fc-toggle">
            <input type="checkbox" id="fc-toggle-gloss" checked={showGloss} onChange={e => toggleGloss(e.target.checked)} />
            <span>Gloss</span>
          </label>
          <label className="fc-toggle">
            <input type="checkbox" id="fc-toggle-sbl-letter" checked={showSBLLetter} onChange={e => toggleSBLLetter(e.target.checked)} />
            <span>SBL Letter</span>
          </label>
          <label className="fc-toggle">
            <input type="checkbox" id="fc-toggle-sbl-word" checked={showSBLWord} onChange={e => toggleSBLWord(e.target.checked)} />
            <span>SBL Word</span>
          </label>
        </div>
      </div>

      {/* Mobile top bar — shown only on mobile, sits above the scroll area */}
      {isMobile && (
        <div className="fc-mobile-bar">
          {/* Combined chapter select — leftmost */}
          <select
            className="fc-mobile-select"
            value={selectedStageIndex}
            onChange={e => {
              const si = Number(e.target.value)
              if (isAccessible(si)) {
                const entry = CHAPTER_REGISTRY.find(c => c.stageIndex === si)
                if (entry) setSelectedBook(entry.book)
                onSelect(si)
              }
            }}
            aria-label="Select chapter"
          >
            {REGISTRY_BOOKS.map(book => (
              <optgroup key={book} label={book} disabled={!bookHasProgress(book)}>
                {CHAPTER_REGISTRY.filter(e => e.book === book).map(entry => (
                  <option
                    key={entry.stageIndex}
                    value={entry.stageIndex}
                    disabled={!isAccessible(entry.stageIndex)}
                  >
                    {book} {entry.chapter}{!isAccessible(entry.stageIndex) ? ' 🔒' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="fc-mobile-sep" aria-hidden="true" />

          <button
            className="fc-mobile-pill fc-mobile-pill--customize"
            onClick={() => setFcCustomizeOpen(true)}
          >
            ⚙️ Customize
          </button>

          <div className="fc-mobile-sep" aria-hidden="true" />

          <button className="fc-mobile-pill" onClick={decSize} disabled={fontSize <= 18} aria-label="Decrease font size">A−</button>
          <button className="fc-mobile-pill" onClick={incSize} disabled={fontSize >= 36} aria-label="Increase font size">A+</button>
        </div>
      )}

      {/* Scrollable text body */}
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
            showSBLWord={showSBLWord}
            showSBLLetter={showSBLLetter}
            showGloss={showGloss}
            onWordClick={onWordClick}
            selectedWordId={selectedWord?.word?.id}
          />
        ))}
        <div className="fc-right__footer">
          {chapterMeta ? `${chapterMeta.book} ${chapterMeta.chapter} — Masoretic Text (BHS) — TAHOT Gloss` : ''}
        </div>
      </div>

      {/* Mobile: Customize bottom sheet */}
      {isMobile && (
        <div
          className={`fc-customize-overlay${fcCustomizeOpen ? ' fc-customize-overlay--open' : ''}`}
          onPointerDown={e => { if (e.target === e.currentTarget) setFcCustomizeOpen(false) }}
          aria-hidden={!fcCustomizeOpen}
        >
          <div className="fc-customize-sheet" role="dialog" aria-label="Customize display options">
            <div className="fc-customize-handle" onClick={() => setFcCustomizeOpen(false)} />
            <h3 className="fc-customize-title">Customize</h3>
            <div className="fc-customize-rows">

              <button className="fc-customize-row" onClick={() => toggleGloss(!showGloss)}>
                <div className="fc-customize-row-label">
                  <span className="fc-customize-row-title">Gloss</span>
                  <span className="fc-customize-row-desc">Show English gloss under each word</span>
                </div>
                <div className={`fc-customize-toggle${showGloss ? ' fc-customize-toggle--on' : ''}`} />
              </button>

              <button className="fc-customize-row" onClick={() => toggleSBLLetter(!showSBLLetter)}>
                <div className="fc-customize-row-label">
                  <span className="fc-customize-row-title">SBL Letter</span>
                  <span className="fc-customize-row-desc">Show transliteration below each letter</span>
                </div>
                <div className={`fc-customize-toggle${showSBLLetter ? ' fc-customize-toggle--on' : ''}`} />
              </button>

              <button className="fc-customize-row" onClick={() => toggleSBLWord(!showSBLWord)}>
                <div className="fc-customize-row-label">
                  <span className="fc-customize-row-title">SBL Word</span>
                  <span className="fc-customize-row-desc">Show full word transliteration</span>
                </div>
                <div className={`fc-customize-toggle${showSBLWord ? ' fc-customize-toggle--on' : ''}`} />
              </button>

            </div>
          </div>
        </div>
      )}
      {/* Mobile: word definition sheet */}
      {isMobile && (() => {
        const sw = selectedWord
        const wordId = sw?.word?.id ?? ''
        const wordData = wordId ? getWord(wordId) : null
        return (
          <WordDefSheet
            open={!!sw}
            onClose={onCloseWord}
            word={wordData}
            activeWord={sw?.word ?? null}
            lemmaMap={lemmaMap}
            wordId={wordId}
            sbl={sw?.word?.sbl ?? ''}
            encounterCount={2}
            isWordCompleted={true}
            onOpenHaber={() => {}}
            isWordNew={false}
            userId={userId}
            book={chapterMeta?.book}
            chapter={chapterMeta?.chapter}
            verseNumber={sw?.verseObj?.verse}
          />
        )
      })()}
    </div>
  )
}
