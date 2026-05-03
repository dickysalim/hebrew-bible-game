import { useState, useMemo } from 'react'
import { useChapterLoader, CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { LETTER_SBL } from '../../utils/hebrewData'
import './FullChapter.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if all words of a verse are typed (completed) based on typedCounts. */
function isVerseCompleted(verse, verseIdx, typedCounts) {
  if (!verse?.words) return false
  return verse.words.every((word, wi) => {
    const typed = typedCounts[`${verseIdx}-${wi}`] ?? 0
    return typed >= word.id.length
  })
}

// ─── Chapter Selector ─────────────────────────────────────────────────────────

function ChapterSelector({ selectedStageIndex, onSelect, completedStageIndexes }) {
  const entries = CHAPTER_REGISTRY.filter(e => completedStageIndexes.has(e.stageIndex))

  if (entries.length === 0) {
    return (
      <div className="fc-selector">
        <span className="fc-selector__label">Chapter</span>
        <span className="fc-selector__empty">Finish a chapter to unlock it here</span>
      </div>
    )
  }

  return (
    <div className="fc-selector">
      <span className="fc-selector__label">Chapter</span>
      <div className="fc-selector__list">
        {entries.map(entry => (
          <button
            key={entry.stageIndex}
            className={`fc-selector__btn ${entry.stageIndex === selectedStageIndex ? 'fc-selector__btn--active' : ''}`}
            onClick={() => onSelect(entry.stageIndex)}
            title={`${entry.book} ${entry.chapter}`}
          >
            <span className="fc-selector__book">{entry.book}</span>
            <span className="fc-selector__ch">{entry.chapter}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Left Panel: Notes tabs only ─────────────────────────────────────────────

function LeftPanel({ verses, chapterMeta, typedCounts }) {
  const [activeTab, setActiveTab] = useState('Verse Notes')
  const TABS = ['Verse Notes', 'Chapter Notes']

  return (
    <div className="fc-left">
      {/* Header */}
      <div className="fc-left__header">
        <span className="fc-left__title">
          {chapterMeta ? `${chapterMeta.book} ${chapterMeta.chapter}` : '—'}
        </span>
        <span className="fc-left__badge">Study Notes</span>
      </div>

      {/* Verse progress pills */}
      <div className="fc-left__verse-list" role="list" aria-label="Verse completion status">
        {verses.map((v, vi) => {
          const done = isVerseCompleted(v, vi, typedCounts)
          return (
            <span
              key={vi}
              role="listitem"
              className={`fc-verse-pill ${done ? 'fc-verse-pill--done' : ''}`}
              title={`Verse ${v.verse}${done ? ' — completed' : ''}`}
            >
              <span className="fc-verse-pill__num">{v.verse}</span>
              {done && <span className="fc-verse-pill__dot" aria-hidden="true" />}
            </span>
          )
        })}
      </div>

      {/* Notes tabs */}
      <div className="fc-notes">
        <div className="fc-notes__tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`fc-notes__tab ${activeTab === tab ? 'fc-notes__tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="fc-notes__body">
          <div className="fc-notes__empty">
            <span className="fc-notes__empty-icon" aria-hidden="true">📝</span>
            <p>{activeTab === 'Verse Notes' ? 'Verse notes coming soon.' : 'Chapter notes coming soon.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Right Panel: Full Hebrew Text ───────────────────────────────────────────

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


function RightPanel({ verses, chapterMeta, typedCounts }) {
  const [showSBLWord, setShowSBLWord] = useState(true)
  const [showSBLLetter, setShowSBLLetter] = useState(true)
  const [showGloss, setShowGloss] = useState(true)

  return (
    <div className="fc-right">
      {/* Controls bar */}
      <div className="fc-right__toolbar">
        <span className="fc-right__chapter-label">
          {chapterMeta ? `${chapterMeta.book} ${chapterMeta.chapter}` : ''}
        </span>
        <div className="fc-right__toggles">
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

      {/* Scrollable text body */}
      <div className="fc-right__scroll" role="document" aria-label="Hebrew chapter text">
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

// ─── Main FullChapter Component ───────────────────────────────────────────────

export default function FullChapter() {
  const { cachedProgress } = useProgressCache()

  // Derive which chapters the user has fully completed.
  // A chapter is complete when highestVerse (0-based count of verses reached)
  // is >= totalVerses for that chapter — this is set by the TYPE reducer the
  // moment the last word of the last verse is typed, no navigation required.
  const completedStageIndexes = useMemo(() => {
    const set = new Set()
    const chapters = cachedProgress?.chapters ?? {}
    CHAPTER_REGISTRY.forEach(entry => {
      const chProgress = chapters[entry.stageIndex]
      if ((chProgress?.highestVerse ?? 0) >= entry.totalVerses) {
        set.add(entry.stageIndex)
      }
    })
    return set
  }, [cachedProgress])

  // Default to the first completed chapter; fall back to 1 if none yet
  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    const chapters = cachedProgress?.chapters ?? {}
    const first = CHAPTER_REGISTRY.find(e =>
      (chapters[e.stageIndex]?.highestVerse ?? 0) >= e.totalVerses
    )
    return first?.stageIndex ?? 1
  })

  const { chapterData, chapterMeta, isLoading } = useChapterLoader(selectedStageIndex)

  // Resolve typed counts for the selected chapter from cached progress
  const typedCounts = useMemo(() => {
    if (!cachedProgress?.chapters) return {}
    const chapterProgress = cachedProgress.chapters[selectedStageIndex]
    return chapterProgress?.typedCounts ?? {}
  }, [cachedProgress, selectedStageIndex])

  const verses = chapterData?.verses ?? []

  if (isLoading) {
    return (
      <div className="fc-panel">
        <div className="fc-loading">
          <div className="fc-loading__spinner" />
          <p>Loading {chapterMeta?.book ?? ''} {chapterMeta?.chapter ?? ''}…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-panel">
      {/* Top bar: chapter selector — only completed chapters */}
      <ChapterSelector
        selectedStageIndex={selectedStageIndex}
        onSelect={setSelectedStageIndex}
        completedStageIndexes={completedStageIndexes}
      />

      {/* Two-column reader */}
      <div className="fc-reader">
        <LeftPanel
          verses={verses}
          chapterMeta={chapterMeta}
          typedCounts={typedCounts}
        />
        <RightPanel
          verses={verses}
          chapterMeta={chapterMeta}
          typedCounts={typedCounts}
        />
      </div>
    </div>
  )
}
