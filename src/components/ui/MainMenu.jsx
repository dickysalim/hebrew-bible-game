import { useState, useEffect, useRef, useMemo } from 'react'
import ProfileSettings from './ProfileSettings'
import { CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { loadProgressFromStorage } from '../../utils/useProgressPersistence'

const DEV_EMAIL = 'dickysal1506@gmail.com'

// Hebrew titles for Genesis — extend as needed
const HEBREW_TITLES = {
  'genesis-1': 'בראשית א',
  'genesis-2': 'בראשית ב',
  'genesis-3': 'בראשית ג',
  'genesis-4': 'בראשית ד',
  'genesis-5': 'בראשית ה',
}

// Chapter descriptions for the first few chapters
const DESCRIPTIONS = {
  'genesis-1': 'In the beginning — Creation',
  'genesis-2': 'The seventh day — The Garden',
  'genesis-3': 'The Fall — Serpent and fruit',
  'genesis-4': 'Cain and Abel',
  'genesis-5': 'Genealogies — Adam to Noah',
}

export default function MainMenu({ onEnterMidrash, onSelectChapter, onLearnAlphabet, session, onSignOut, onResetProgress }) {
  const [showChapterSelect, setShowChapterSelect] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selectedBook, setSelectedBook] = useState('Genesis')
  const confirmTimerRef = useRef(null)

  const { cachedProgress, cacheStatus } = useProgressCache()
  const isDev = session?.user?.email === DEV_EMAIL

  // Auto-cancel confirm state after 5s for safety
  useEffect(() => {
    if (confirmReset) {
      confirmTimerRef.current = setTimeout(() => setConfirmReset(false), 5000)
    }
    return () => clearTimeout(confirmTimerRef.current)
  }, [confirmReset])

  // Build a map of stageIndex -> { highestVerse, totalVerses } from progress
  const chapterProgressMap = useMemo(() => {
    let chapters = {}

    // Try Supabase cache first (logged-in users), then localStorage (guests)
    if (cacheStatus === 'ready' && cachedProgress?.chapters) {
      chapters = cachedProgress.chapters
    } else {
      try {
        const local = loadProgressFromStorage()
        chapters = local.chapters || {}
      } catch {
        chapters = {}
      }
    }
    return chapters
  }, [cachedProgress, cacheStatus])

  // A chapter is accessible if the user has any progress in it (highestVerse > 0)
  // OR it's the very first chapter (always available)
  const isAccessible = (entry) => {
    if (entry.stageIndex === 1) return true
    const prog = chapterProgressMap[entry.stageIndex]
    return (prog?.highestVerse ?? 0) > 0
  }

  const isCompleted = (entry) => {
    const prog = chapterProgressMap[entry.stageIndex]
    return (prog?.highestVerse ?? 0) >= entry.totalVerses
  }

  const getVerseProgress = (entry) => {
    const prog = chapterProgressMap[entry.stageIndex]
    return prog?.highestVerse ?? 0
  }

  // All books that have at least one accessible chapter
  const accessibleBooks = useMemo(() => {
    const seen = new Set()
    const books = []
    CHAPTER_REGISTRY.forEach(e => {
      if (!seen.has(e.book) && isAccessible(e)) {
        seen.add(e.book)
        books.push(e.book)
      }
    })
    return books
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterProgressMap])

  // Chapters in the selected book that are accessible
  const chaptersForBook = useMemo(() =>
    CHAPTER_REGISTRY.filter(e => e.book === selectedBook && isAccessible(e)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedBook, chapterProgressMap])

  // When chapter select opens, default to first accessible book
  useEffect(() => {
    if (showChapterSelect && accessibleBooks.length > 0) {
      setSelectedBook(accessibleBooks[0])
    }
  }, [showChapterSelect, accessibleBooks])

  const handleChapterClick = (entry) => {
    onSelectChapter({ id: entry.id, stageIndex: entry.stageIndex })
  }

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setResetting(true)
    Promise.resolve()
      .then(() => onResetProgress())
      .then(() => window.location.reload())
      .catch((err) => {
        console.error('[handleResetClick] ❌ Reset failed:', err?.message || err)
        setResetting(false)
        setConfirmReset(false)
      })
  }

  return (
    <div className="main-menu-screen">
      {/* Decorative Hebrew letters background */}
      <div className="menu-bg-letters" aria-hidden="true">
        <span>בראשית</span>
        <span>אלהים</span>
        <span>תורה</span>
        <span>שלום</span>
      </div>

      <div className="menu-content">
        {/* Title block */}
        <header className="menu-header">
          <div className="menu-hebrew-title" lang="he" dir="rtl">מדרש</div>
          <h1 className="menu-title">Midrash</h1>
          <p className="menu-subtitle">
            Explore, Question, and Interpret the Bible in The Original Language
          </p>
        </header>

        {/* Chapter select panel */}
        {showChapterSelect ? (
          <div className="chapter-select-panel">
            <button
              className="chapter-back-btn"
              onClick={() => setShowChapterSelect(false)}
              aria-label="Back to main menu"
            >
              ← Back
            </button>
            <h2 className="chapter-select-title">Select Chapter</h2>
            <p className="chapter-select-hint">Jump to any chapter you've reached</p>

            {/* Book tabs */}
            {accessibleBooks.length > 1 && (
              <div className="chapter-book-tabs" role="tablist" aria-label="Select book">
                {accessibleBooks.map(book => (
                  <button
                    key={book}
                    role="tab"
                    aria-selected={selectedBook === book}
                    className={`chapter-book-tab${selectedBook === book ? ' chapter-book-tab--active' : ''}`}
                    onClick={() => setSelectedBook(book)}
                  >
                    {book}
                  </button>
                ))}
              </div>
            )}

            <div className="chapter-list">
              {chaptersForBook.length === 0 ? (
                <p className="chapter-none-msg">No chapters unlocked in {selectedBook} yet.</p>
              ) : (
                chaptersForBook.map((entry) => {
                  const completed = isCompleted(entry)
                  const progress = getVerseProgress(entry)
                  const pct = Math.min(100, Math.round((progress / entry.totalVerses) * 100))

                  return (
                    <button
                      key={entry.id}
                      className={`chapter-card${completed ? ' chapter-card--done' : ''}`}
                      onClick={() => handleChapterClick(entry)}
                      aria-label={`${entry.book} chapter ${entry.chapter}${completed ? ' — completed' : `, ${progress} of ${entry.totalVerses} verses`}`}
                    >
                      {/* Hebrew title if known */}
                      {HEBREW_TITLES[entry.id] && (
                        <div className="chapter-card-hebrew" lang="he" dir="rtl">
                          {HEBREW_TITLES[entry.id]}
                        </div>
                      )}
                      <div className="chapter-card-main">
                        <span className="chapter-card-name">
                          {entry.book} {entry.chapter}
                        </span>
                        <span className="chapter-card-desc">
                          {DESCRIPTIONS[entry.id] ?? `${entry.totalVerses} verses`}
                        </span>
                      </div>
                      <div className="chapter-card-meta">
                        {completed ? (
                          <span className="chapter-card-done-badge" aria-label="Completed">✓</span>
                        ) : (
                          <span className="chapter-card-progress">{progress}/{entry.totalVerses}</span>
                        )}
                        <span className="chapter-card-arrow">→</span>
                      </div>

                      {/* Progress bar */}
                      {!completed && (
                        <div className="chapter-card-bar" aria-hidden="true">
                          <div className="chapter-card-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          /* Main option buttons */
          <nav className="menu-options" aria-label="Main menu options">
            {/* Enter Midrash */}
            <button
              id="btn-enter-midrash"
              className="menu-option"
              onClick={onEnterMidrash}
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew" lang="he">קרא</span>
              </div>
              <div className="menu-option-text">
                <span className="menu-option-title">Enter Midrash</span>
                <span className="menu-option-desc">Continue from where you left off</span>
              </div>
              <span className="menu-option-chevron" aria-hidden="true">›</span>
            </button>

            {/* Chapter Select */}
            <button
              id="btn-chapter-select"
              className="menu-option"
              onClick={() => setShowChapterSelect(true)}
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew" lang="he">פרק</span>
              </div>
              <div className="menu-option-text">
                <span className="menu-option-title">Chapter Select</span>
                <span className="menu-option-desc">Jump to any chapter you've reached</span>
              </div>
              <span className="menu-option-chevron" aria-hidden="true">›</span>
            </button>

            {/* Learn Hebrew Alphabet */}
            <button
              id="btn-learn-alphabet"
              className="menu-option"
              onClick={onLearnAlphabet}
              aria-label="Learn Hebrew Alphabet"
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew" lang="he">אבג</span>
              </div>
              <div className="menu-option-text">
                <span className="menu-option-title">Learn Hebrew Alphabet</span>
                <span className="menu-option-desc">4 levels · SBL sounds, names &amp; spelling</span>
              </div>
              <span className="menu-option-chevron" aria-hidden="true">›</span>
            </button>

            {/* Profile Settings */}
            {session && (
              <button
                id="btn-profile-settings"
                className="menu-option"
                onClick={() => setShowProfile(true)}
                aria-label="Profile Settings"
              >
                <div className="menu-option-icon" aria-hidden="true">
                  <span className="menu-option-hebrew" lang="he">⚙</span>
                </div>
                <div className="menu-option-text">
                  <span className="menu-option-title">Profile Settings</span>
                  <span className="menu-option-desc">Change email or password</span>
                </div>
                <span className="menu-option-chevron" aria-hidden="true">›</span>
              </button>
            )}

            {/* Reset Progress — dev account only */}
            {isDev && (
              <div className="menu-reset-wrap">
                {confirmReset && (
                  <div className="menu-reset-confirm" role="alert">
                    <span className="menu-reset-confirm-icon" aria-hidden="true">⚠️</span>
                    <span>This will wipe <strong>all</strong> progress from the database. Are you sure?</span>
                  </div>
                )}
                <button
                  id="btn-reset-progress"
                  className={`menu-option menu-option--danger${confirmReset ? ' menu-option--danger-confirm' : ''}`}
                  onClick={handleResetClick}
                  disabled={resetting}
                  aria-label="Reset all progress"
                >
                  <div className="menu-option-icon" aria-hidden="true">
                    <span className="menu-option-hebrew" lang="he">✕</span>
                  </div>
                  <div className="menu-option-text">
                    <span className="menu-option-title">
                      {resetting ? 'Resetting…' : confirmReset ? 'Tap again to confirm reset' : 'Reset Progress'}
                    </span>
                    <span className="menu-option-desc">
                      {confirmReset ? 'All data will be permanently deleted' : 'Dev only · Wipe all saved progress'}
                    </span>
                  </div>
                  {!resetting && (
                    <span className="menu-option-chevron" aria-hidden="true">
                      {confirmReset ? '!' : '›'}
                    </span>
                  )}
                </button>
              </div>
            )}
          </nav>
        )}

        {/* Footer */}
        <footer className="menu-footer">
          <span className="menu-footer-note">Masoretic Text (BHS) · ESV Translation</span>
          {session && (
            <div className="menu-account">
              <button
                className="menu-user menu-user--btn"
                onClick={() => setShowProfile(true)}
                aria-label="Open profile settings"
                title="Profile Settings"
              >
                {session.user.email}
              </button>
              <button className="menu-signout-btn" onClick={onSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* Profile Settings modal */}
      {showProfile && session && (
        <ProfileSettings
          session={session}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
