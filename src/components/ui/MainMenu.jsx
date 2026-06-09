import { useState, useEffect, useRef, useMemo } from 'react'
import ProfileSettings from './ProfileSettings'
import { CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { loadProgressFromStorage } from '../../utils/useProgressPersistence'

const DEV_EMAIL = 'dickysal1506@gmail.com'



function readProgress(cachedProgress, cacheStatus) {
  if (cacheStatus === 'ready' && cachedProgress) {
    return {
      highestWordOrder: cachedProgress.highestWordOrder ?? 0,
      currentStageIndex: cachedProgress.currentStageIndex ?? 1,
    }
  }
  try {
    const local = loadProgressFromStorage()
    return {
      highestWordOrder: local.highestWordOrder ?? 0,
      currentStageIndex: local.currentStageIndex ?? 1,
    }
  } catch {
    return { highestWordOrder: 0, currentStageIndex: 1 }
  }
}

export default function MainMenu({ onEnterMidrash, onSelectChapter, onLearnAlphabet, session, onSignOut, onResetProgress }) {
  const [showChapterSelect, setShowChapterSelect] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const confirmTimerRef = useRef(null)

  const { cachedProgress, cacheStatus } = useProgressCache()
  const isDev = session?.user?.email === DEV_EMAIL

  useEffect(() => {
    if (confirmReset) {
      confirmTimerRef.current = setTimeout(() => setConfirmReset(false), 5000)
    }
    return () => clearTimeout(confirmTimerRef.current)
  }, [confirmReset])

  const { highestWordOrder, currentStageIndex } = useMemo(
    () => readProgress(cachedProgress, cacheStatus),
    [cachedProgress, cacheStatus],
  )

  const isCompleted = (entry) => highestWordOrder >= entry.lastWordOrder

  const isAccessible = (entry) =>
    entry.firstWordOrder <= highestWordOrder + 1

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
  }, [highestWordOrder, currentStageIndex])

  const chaptersForBook = useMemo(() =>
    CHAPTER_REGISTRY.filter(e => e.book === selectedBook && isAccessible(e)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedBook, highestWordOrder, currentStageIndex])



  const handleChapterClick = (entry) => {
    onSelectChapter({ stageIndex: entry.stageIndex, firstWordOrder: entry.firstWordOrder })
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
      <div className="menu-bg-letters" aria-hidden="true">
        <span>בראשית</span>
        <span>אלהים</span>
        <span>תורה</span>
        <span>שלום</span>
      </div>

      <div className="menu-content">
        <header className="menu-header">
          <div className="menu-hebrew-title" lang="he" dir="rtl">מדרש</div>
          <h1 className="menu-title">Midrash</h1>
          <p className="menu-subtitle">
            Explore, Question, and Interpret the Bible in The Original Language
          </p>
        </header>

        {showChapterSelect ? (
          <div className="chapter-select-panel">
            <button
              className="chapter-back-btn"
              onClick={() => {
                if (selectedBook) setSelectedBook(null)
                else setShowChapterSelect(false)
              }}
              aria-label={selectedBook ? `Back to book list` : 'Back to main menu'}
            >
              ← {selectedBook || 'Back'}
            </button>

            {!selectedBook ? (
              <>
                <h2 className="chapter-select-title">Select Book</h2>
                <p className="chapter-select-hint">Jump to any book you've reached</p>
                <div className="chapter-list">
                  {accessibleBooks.map(book => {
                    const bookChapters = CHAPTER_REGISTRY.filter(e => e.book === book)
                    const completedCount = bookChapters.filter(e => isCompleted(e)).length
                    const totalCount = bookChapters.length
                    const allDone = completedCount === totalCount
                    const isCurrent = bookChapters.some(e => e.stageIndex === currentStageIndex)

                    return (
                      <button
                        key={book}
                        className={`chapter-card${allDone ? ' chapter-card--done' : ''}${isCurrent && !allDone ? ' chapter-card--current' : ''}`}
                        onClick={() => setSelectedBook(book)}
                        aria-label={`${book}${allDone ? ' — completed' : isCurrent ? ' — in progress' : ''}`}
                      >
                        <div className="chapter-card-main">
                          <span className="chapter-card-name">{book}</span>
                          <span className="chapter-card-desc">
                            {allDone
                              ? `${totalCount} chapters · completed`
                              : `${completedCount} / ${totalCount} chapters`}
                          </span>
                        </div>
                        <div className="chapter-card-meta">
                          {allDone ? (
                            <span className="chapter-card-done-badge" aria-label="Completed">✓</span>
                          ) : isCurrent ? (
                            <span className="chapter-card-progress">Current</span>
                          ) : null}
                          <span className="chapter-card-arrow">→</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <h2 className="chapter-select-title">{selectedBook}</h2>
                <p className="chapter-select-hint">Select a chapter</p>
                <div className="chapter-list">
                  {chaptersForBook.length === 0 ? (
                    <p className="chapter-none-msg">No chapters unlocked in {selectedBook} yet.</p>
                  ) : (
                    chaptersForBook.map((entry) => {
                      const completed = isCompleted(entry)
                      const isCurrent = entry.stageIndex === currentStageIndex

                      return (
                        <button
                          key={entry.id}
                          className={`chapter-card${completed ? ' chapter-card--done' : ''}${isCurrent && !completed ? ' chapter-card--current' : ''}`}
                          onClick={() => handleChapterClick(entry)}
                          aria-label={`Chapter ${entry.chapter}${completed ? ' — completed' : isCurrent ? ' — in progress' : ''}`}
                        >
                          <div className="chapter-card-main">
                            <span className="chapter-card-name">Chapter {entry.chapter}</span>
                            <span className="chapter-card-desc">{entry.totalVerses} verses</span>
                          </div>
                          <div className="chapter-card-meta">
                            {completed ? (
                              <span className="chapter-card-done-badge" aria-label="Completed">✓</span>
                            ) : isCurrent ? (
                              <span className="chapter-card-progress">Current</span>
                            ) : null}
                            <span className="chapter-card-arrow">→</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <nav className="menu-options" aria-label="Main menu options">
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

      {showProfile && session && (
        <ProfileSettings
          session={session}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}

