import { useState, useCallback } from 'react'
import Level1 from './Level1.jsx'
import Level2 from './Level2.jsx'
import Level3 from './Level3.jsx'
import Level4 from './Level4.jsx'
import Level5 from './Level5.jsx'

const STORAGE_KEY = 'alphabet_progress'

const LEVEL_META = [
  {
    id: 1,
    numeral: '01',
    title: 'SBL Sounds',
    desc: 'Match each letter to its sound transliteration',
    mechanic: 'Sequential · Try again on wrong',
    icon: '🔊',
  },
  {
    id: 2,
    numeral: '02',
    title: 'Letter Names',
    desc: 'Name every letter in order — see sofit forms too',
    mechanic: 'Sequential · Reset to Aleph on wrong',
    icon: '📖',
  },
  {
    id: 3,
    numeral: '03',
    title: '27-Streak',
    desc: 'Name all 27 forms in random order — 27 in a row',
    mechanic: 'Random shuffle · Streak resets on wrong',
    icon: '🔥',
  },
  {
    id: 4,
    numeral: '04',
    title: 'Type the Symbol',
    desc: 'See the name — type the Hebrew key. 27 in a row',
    mechanic: 'Random shuffle · Space to advance · Try again on wrong',
    icon: '🎹',
  },
  {
    id: 5,
    numeral: '05',
    title: 'Sound to Symbol',
    desc: 'See the SBL sound — type the Hebrew key. 27 in a row',
    mechanic: 'Random shuffle · Space to advance · Try again on wrong',
    icon: '🔉',
  },
]

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { level1: false, level2: false, level3: false, level4: false, level5: false }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {}
}

export default function AlphabetHub({ onBack }) {
  const [progress, setProgress] = useState(loadProgress)
  const [activeLevel, setActiveLevel] = useState(null)

  const isUnlocked = (levelId) => {
    if (levelId === 1) return true
    return progress[`level${levelId - 1}`]
  }

  const handleLevelComplete = useCallback((levelId) => {
    const key = `level${levelId}`
    const updated = { ...progress, [key]: true }
    setProgress(updated)
    saveProgress(updated)
    setActiveLevel(null)
  }, [progress])

  if (activeLevel === 1) return <Level1 onComplete={() => handleLevelComplete(1)} onBack={() => setActiveLevel(null)} />
  if (activeLevel === 2) return <Level2 onComplete={() => handleLevelComplete(2)} onBack={() => setActiveLevel(null)} />
  if (activeLevel === 3) return <Level3 onComplete={() => handleLevelComplete(3)} onBack={() => setActiveLevel(null)} />
  if (activeLevel === 4) return <Level4 onComplete={() => handleLevelComplete(4)} onBack={() => setActiveLevel(null)} />
  if (activeLevel === 5) return <Level5 onComplete={() => handleLevelComplete(5)} onBack={() => setActiveLevel(null)} />

  const completedCount = [1,2,3,4,5].filter(n => progress[`level${n}`]).length

  return (
    <div className="alphabet-hub-screen">
      {/* Background decorative letters — no nikud */}
      <div className="menu-bg-letters" aria-hidden="true">
        <span lang="he">אבג</span>
        <span lang="he">דהו</span>
        <span lang="he">זחט</span>
        <span lang="he">יכל</span>
      </div>

      <div className="alphabet-hub-content">
        {/* Header with back button on left */}
        <div className="hub-header">
          <button className="hub-back-btn" onClick={onBack} aria-label="Back to main menu">
            ← Main Menu
          </button>
          <div className="hub-title-block">
            {/* No nikud — plain consonantal Hebrew */}
            <div className="hub-hebrew-title" lang="he" dir="rtl">אלף-בית</div>
            <h1 className="hub-title">Hebrew Alphabet</h1>
            <p className="hub-subtitle">
              {completedCount === 5
              ? 'All levels complete — well done!'
              : `${completedCount} of 5 levels complete`}
            </p>
          </div>
        </div>

        {/* Level cards */}
        <div className="hub-level-grid">
          {LEVEL_META.map((meta) => {
            const unlocked = isUnlocked(meta.id)
            const completed = progress[`level${meta.id}`]
            return (
              <button
                key={meta.id}
                id={`hub-level-${meta.id}`}
                className={`level-card${!unlocked ? ' level-card--locked' : ''}${completed ? ' level-card--done' : ''}`}
                onClick={() => unlocked && setActiveLevel(meta.id)}
                disabled={!unlocked}
                aria-label={`Level ${meta.id}: ${meta.title}${!unlocked ? ' — locked' : completed ? ' — completed' : ''}`}
              >
                {/* Status indicator */}
                <div className="level-card-status">
                  {!unlocked ? (
                    <span className="level-card-lock-icon">🔒</span>
                  ) : completed ? (
                    <span className="level-card-check-icon">✓</span>
                  ) : (
                    <span className="level-card-icon" aria-hidden="true">{meta.icon}</span>
                  )}
                </div>

                <div className="level-card-body">
                  <div className="level-card-tag">Level {meta.id}</div>
                  <div className="level-card-title">{meta.title}</div>
                  <div className="level-card-desc">{meta.desc}</div>
                  <div className="level-card-mechanic">{meta.mechanic}</div>
                </div>

                {unlocked && !completed && (
                  <span className="level-card-arrow" aria-hidden="true">›</span>
                )}
              </button>
            )
          })}
        </div>

        <p className="hub-footer-note">Progress is saved automatically in your browser</p>
      </div>
    </div>
  )
}
