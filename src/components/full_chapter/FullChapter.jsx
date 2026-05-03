import { useState, useMemo } from 'react'
import { useChapterLoader, CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { LETTER_SBL } from '../../utils/hebrewData'
import ChapterNotesEditor from './ChapterNotesEditor'
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

// ─── Chapter Dropdown Bar ────────────────────────────────────────────────────

// Derive unique books (in registry order, de-duped)
const REGISTRY_BOOKS = [...new Set(CHAPTER_REGISTRY.map(e => e.book))]

function ChapterDropdownBar({ selectedStageIndex, onSelect, completedStageIndexes, cachedProgress }) {
  const selectedEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === selectedStageIndex)
  const [selectedBook, setSelectedBook] = useState(selectedEntry?.book ?? REGISTRY_BOOKS[0])

  // When the outer selection changes (e.g. on mount), sync the book
  // so the chapter dropdown stays coherent.
  const handleBookChange = (e) => {
    const book = e.target.value
    setSelectedBook(book)
    // Auto-select the first completed chapter in the new book, or just first
    const chaptersForBook = CHAPTER_REGISTRY.filter(c => c.book === book)
    const firstDone = chaptersForBook.find(c => completedStageIndexes.has(c.stageIndex))
    if (firstDone) onSelect(firstDone.stageIndex)
  }

  const handleChapterChange = (e) => {
    const si = Number(e.target.value)
    if (completedStageIndexes.has(si)) onSelect(si)
  }

  const chaptersForBook = CHAPTER_REGISTRY.filter(e => e.book === selectedBook)

  // A book is "active" (not disabled) if it has at least one completed chapter
  const bookHasProgress = (book) =>
    CHAPTER_REGISTRY.some(e => e.book === book && completedStageIndexes.has(e.stageIndex))

  return (
    <div className="fc-dropbar">
      <span className="fc-dropbar__label">Reading</span>

      {/* Book select */}
      <select
        className="fc-dropbar__select"
        value={selectedBook}
        onChange={handleBookChange}
        aria-label="Select book"
      >
        {REGISTRY_BOOKS.map(book => (
          <option
            key={book}
            value={book}
            disabled={!bookHasProgress(book)}
            className={!bookHasProgress(book) ? 'fc-dropbar__opt--dim' : ''}
          >
            {book}
          </option>
        ))}
      </select>

      {/* Chapter select */}
      <select
        className="fc-dropbar__select"
        value={selectedStageIndex}
        onChange={handleChapterChange}
        aria-label="Select chapter"
      >
        {chaptersForBook.map(entry => {
          const done = completedStageIndexes.has(entry.stageIndex)
          return (
            <option
              key={entry.stageIndex}
              value={entry.stageIndex}
              disabled={!done}
            >
              {done ? `Chapter ${entry.chapter}` : `Chapter ${entry.chapter} — locked`}
            </option>
          )
        })}
      </select>
    </div>
  )
}

// ─── Left Panel: 5-tab study panel ───────────────────────────────────────────

const FC_TABS = [
  { id: 'verse-notes',  label: 'Verse Notes' },
  { id: 'lemma',        label: 'Lemma' },
  { id: 'root',         label: 'Root' },
  { id: 'concordance',  label: 'Concordance' },
]

function WipPlaceholder({ icon, message }) {
  return (
    <div className="fc-wip">
      <span className="fc-wip__icon" aria-hidden="true">{icon}</span>
      <p>{message}</p>
    </div>
  )
}

function LeftPanel({ userId, chapterMeta }) {
  const [activeTab, setActiveTab] = useState('verse-notes')

  return (
    <div className="fc-left">
      {/* ── Top pane: tabbed content ── */}
      <div className="fc-left__top">
        <div className="fc-notes__tabs" role="tablist" aria-label="Study panel tabs">
          {FC_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`fc-notes__tab ${activeTab === tab.id ? 'fc-notes__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="fc-notes__body">
          {activeTab === 'verse-notes' && (
            <WipPlaceholder icon="📝" message="Verse notes coming soon." />
          )}
          {activeTab === 'lemma' && (
            <WipPlaceholder icon="🔤" message="Click a word in the text to see its lemma entry." />
          )}
          {activeTab === 'root' && (
            <WipPlaceholder icon="🌱" message="Click a word in the text to see its root." />
          )}
          {activeTab === 'concordance' && (
            <WipPlaceholder icon="🔍" message="Click a word in the text to see concordance data." />
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="fc-left__divider" aria-hidden="true" />

      {/* ── Bottom pane: Chapter Notes ── */}
      <div className="fc-left__bottom">
        <div className="fc-left__bottom-header">
          <span className="fc-left__bottom-label">Chapter Notes</span>
        </div>
        <div className="fc-left__bottom-body">
          <ChapterNotesEditor
            userId={userId}
            book={chapterMeta?.book ?? ''}
            chapter={chapterMeta?.chapter ?? 0}
          />
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


function RightPanel({ verses, chapterMeta, typedCounts, selectedStageIndex, onSelect, completedStageIndexes }) {
  const [showSBLWord, setShowSBLWord] = useState(true)
  const [showSBLLetter, setShowSBLLetter] = useState(true)
  const [showGloss, setShowGloss] = useState(true)

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

export default function FullChapter({ userId }) {
  const { cachedProgress } = useProgressCache()

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

  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    const chapters = cachedProgress?.chapters ?? {}
    const first = CHAPTER_REGISTRY.find(e =>
      (chapters[e.stageIndex]?.highestVerse ?? 0) >= e.totalVerses
    )
    return first?.stageIndex ?? 1
  })

  const { chapterData, chapterMeta, isLoading } = useChapterLoader(selectedStageIndex)

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
      {/* Two-column reader — dropdown bar is now inside the right panel toolbar */}
      <div className="fc-reader">
        <LeftPanel userId={userId} chapterMeta={chapterMeta} />
        <RightPanel
          verses={verses}
          chapterMeta={chapterMeta}
          typedCounts={typedCounts}
          selectedStageIndex={selectedStageIndex}
          onSelect={setSelectedStageIndex}
          completedStageIndexes={completedStageIndexes}
        />
      </div>
    </div>
  )
}
