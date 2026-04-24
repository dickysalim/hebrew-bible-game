import { useState } from 'react'

// Chapter data — mirrors the verse files available in /data/verses/
const CHAPTERS = [
  {
    id: 'genesis-1',
    book: 'Genesis',
    chapter: 1,
    hebrewTitle: 'בְּרֵאשִׁית א',
    description: 'In the beginning — Creation',
    verseCount: 31,
    available: true,
  },
  {
    id: 'genesis-2',
    book: 'Genesis',
    chapter: 2,
    hebrewTitle: 'בְּרֵאשִׁית ב',
    description: 'The seventh day — The Garden',
    verseCount: 25,
    available: true,
  },
]

export default function MainMenu({ onEnterMidrash, onSelectChapter, onLearnAlphabet, session }) {
  const [showChapterSelect, setShowChapterSelect] = useState(false)

  const handleChapterClick = (chapter) => {
    if (!chapter.available) return
    onSelectChapter(chapter)
  }

  return (
    <div className="main-menu-screen">
      {/* Decorative Hebrew letters background */}
      <div className="menu-bg-letters" aria-hidden="true">
        <span>בְּרֵאשִׁית</span>
        <span>אֱלֹהִים</span>
        <span>תּוֹרָה</span>
        <span>שָׁלוֹם</span>
      </div>

      <div className="menu-content">
        {/* Title block */}
        <header className="menu-header">
          <div className="menu-hebrew-title">מִדְרַשׁ</div>
          <h1 className="menu-title">Hebrew Bible Game</h1>
          <p className="menu-subtitle">
            Learn to read the Masoretic Text, word by word
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
                  <div className="chapter-card-hebrew">{ch.hebrewTitle}</div>
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
          /* Main option buttons */
          <nav className="menu-options" aria-label="Main menu options">
            {/* Enter Midrash */}
            <button
              id="btn-enter-midrash"
              className="menu-option menu-option--primary"
              onClick={onEnterMidrash}
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew">קְרָא</span>
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
              className="menu-option menu-option--secondary"
              onClick={() => setShowChapterSelect(true)}
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew">פֶּרֶק</span>
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
              className="menu-option menu-option--alphabet"
              onClick={onLearnAlphabet}
              aria-label="Learn Hebrew Alphabet"
            >
              <div className="menu-option-icon" aria-hidden="true">
                <span className="menu-option-hebrew">אבג</span>
              </div>
              <div className="menu-option-text">
                <span className="menu-option-title">Learn Hebrew Alphabet</span>
                <span className="menu-option-desc">4 levels · SBL sounds, names &amp; spelling</span>
              </div>
              <span className="menu-option-chevron" aria-hidden="true">›</span>
            </button>
          </nav>
        )}

        {/* Footer */}
        <footer className="menu-footer">
          {session && (
            <span className="menu-user">{session.user.email}</span>
          )}
          <span className="menu-footer-note">Masoretic Text (BHS) · ESV Translation</span>
        </footer>
      </div>
    </div>
  )
}
