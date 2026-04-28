import { useState, useEffect, useRef } from 'react'
import ProfileSettings from './ProfileSettings'

const DEV_EMAIL = 'dickysal1506@gmail.com'

// Chapter data — mirrors the verse files available in /data/verses/
const CHAPTERS = [
  {
    id: 'genesis-1',
    stageIndex: 1,
    book: 'Genesis',
    chapter: 1,
    hebrewTitle: 'בראשית א',
    description: 'In the beginning — Creation',
    verseCount: 31,
    available: true,
  },
  {
    id: 'genesis-2',
    stageIndex: 2,
    book: 'Genesis',
    chapter: 2,
    hebrewTitle: 'בראשית ב',
    description: 'The seventh day — The Garden',
    verseCount: 25,
    available: true,
  },
]

export default function MainMenu({ onEnterMidrash, onSelectChapter, onLearnAlphabet, session, onSignOut, onResetProgress }) {
  const [showChapterSelect, setShowChapterSelect] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const confirmTimerRef = useRef(null)

  const isDev = session?.user?.email === DEV_EMAIL

  // Auto-cancel confirm state after 5s for safety
  useEffect(() => {
    if (confirmReset) {
      confirmTimerRef.current = setTimeout(() => setConfirmReset(false), 5000)
    }
    return () => clearTimeout(confirmTimerRef.current)
  }, [confirmReset])

  const handleChapterClick = (chapter) => {
    if (!chapter.available) return
    onSelectChapter(chapter)
  }

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    // Second click — execute reset
    setResetting(true)
    console.log('[handleResetClick] Starting reset...')
    Promise.resolve()
      .then(() => onResetProgress())
      .then(() => {
        console.log('[handleResetClick] ✅ Reset done — reloading')
        window.location.reload()
      })
      .catch((err) => {
        console.error('[handleResetClick] ❌ Reset failed:', err?.message || err)
        setResetting(false)
        setConfirmReset(false)
      })
  }

  return (
    <div className="main-menu-screen">
      {/* Decorative Hebrew letters background — no nikud */}
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

        {/* Chapter select panel — inline reveal */}
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
            <p className="chapter-select-hint">Choose where to begin your study</p>

            <div className="chapter-list">
              {CHAPTERS.map((ch) => (
                <button
                  key={ch.id}
                  className={`chapter-card${ch.available ? '' : ' chapter-card--locked'}`}
                  onClick={() => handleChapterClick(ch)}
                  disabled={!ch.available}
                  aria-label={`${ch.book} chapter ${ch.chapter}${!ch.available ? ' — locked' : ''}`}
                >
                  {/* No nikud on Hebrew titles */}
                  <div className="chapter-card-hebrew" lang="he" dir="rtl">{ch.hebrewTitle}</div>
                  <div className="chapter-card-main">
                    <span className="chapter-card-name">
                      {ch.book} {ch.chapter}
                    </span>
                    <span className="chapter-card-desc">{ch.description}</span>
                  </div>
                  <div className="chapter-card-meta">
                    {ch.available ? (
                      <>
                        <span className="chapter-card-verses">{ch.verseCount} verses</span>
                        <span className="chapter-card-arrow">→</span>
                      </>
                    ) : (
                      <span className="chapter-card-lock">🔒</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Main option buttons — all uniform style */
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
                <span className="menu-option-desc">Jump to the start of any chapter</span>
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

        {/* Footer — email + sign out */}
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
