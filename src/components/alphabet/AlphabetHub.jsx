import { useState, useEffect, useCallback } from 'react'
import Level1 from './Level1.jsx'
import Level2 from './Level2.jsx'
import Level3 from './Level3.jsx'
import Level4 from './Level4.jsx'

const STORAGE_KEY = 'alphabet_progress'

const LEVEL_META = [
  {
    id: 1,
    hebrewNumeral: 'א',
    title: 'SBL Sounds',
    desc: 'Match each letter to its SBL transliteration',
    mechanic: 'Sequential · Try again on wrong',
    emoji: '🔊',
  },
  {
    id: 2,
    hebrewNumeral: 'ב',
    title: 'Letter Names',
    desc: 'Name every letter — in order, no mistakes',
    mechanic: 'Sequential · Reset to Aleph on wrong',
    emoji: '📖',
  },
  {
    id: 3,
    hebrewNumeral: 'ג',
    title: '22-Streak',
    desc: 'Name letters in random order — 22 in a row',
    mechanic: 'Random shuffle · Streak resets on wrong',
    emoji: '🔥',
  },
  {
    id: 4,
    hebrewNumeral: 'ד',
    title: 'Spell It',
    desc: 'Tap letter names to spell Hebrew words',
    mechanic: '10-word streak · Order matters',
    emoji: '👑',
  },
]

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { level1: false, level2: false, level3: false, level4: false }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {}
}

/**
 * AlphabetHub — Level selection lobby
 * Manages progress unlocks and renders the active level component.
 */
export default function AlphabetHub({ onBack }) {
  const [progress, setProgress] = useState(loadProgress)
  const [activeLevel, setActiveLevel] = useState(null)  // 1 | 2 | 3 | 4 | null

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

  // Render active level
  if (activeLevel === 1) {
    return <Level1 onComplete={() => handleLevelComplete(1)} onBack={() => setActiveLevel(null)} />
  }
  if (activeLevel === 2) {
    return <Level2 onComplete={() => handleLevelComplete(2)} onBack={() => setActiveLevel(null)} />
  }
  if (activeLevel === 3) {
    return <Level3 onComplete={() => handleLevelComplete(3)} onBack={() => setActiveLevel(null)} />
  }
  if (activeLevel === 4) {
    return <Level4 onComplete={() => handleLevelComplete(4)} onBack={() => setActiveLevel(null)} />
  }

  // Hub view
  return (
    <div className="alphabet-hub-screen">
      {/* Decorative background */}
      <div className="menu-bg-letters" aria-hidden="true">
        <span>אבג</span>
        <span>דהו</span>
        <span>זחט</span>
        <span>יכל</span>
      </div>

      <div className="alphabet-hub-content">
        {/* Header */}
        <div className="hub-header">
          <button className="level-back-btn" onClick={onBack} aria-label="Back to main menu">
            ← Main Menu
          </button>
          <div className="hub-title-block">
            <div className="hub-hebrew-title" lang="he" dir="rtl">אָלֶף-בֵּית</div>
            <h1 className="hub-title">Learn Hebrew Alphabet</h1>
            <p className="hub-subtitle">Complete each level to unlock the next</p>
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
                className={`level-card${unlocked ? '' : ' level-card--locked'}${completed ? ' level-card--done' : ''}`}
                onClick={() => unlocked && setActiveLevel(meta.id)}
                disabled={!unlocked}
                aria-label={`Level ${meta.id}: ${meta.title}${!unlocked ? ' — locked' : completed ? ' — completed' : ''}`}
              >
                {/* Hebrew numeral + lock / checkmark */}
                <div className="level-card-numeral" lang="he">
                  {!unlocked ? '🔒' : completed ? '✓' : meta.hebrewNumeral}
                </div>

                {/* Level info */}
                <div className="level-card-body">
                  <div className="level-card-tag">Level {meta.id}</div>
                  <div className="level-card-title">{meta.title}</div>
                  <div className="level-card-desc">{meta.desc}</div>
                  <div className="level-card-mechanic">{meta.mechanic}</div>
                </div>

                {/* Emoji badge */}
                <div className="level-card-emoji" aria-hidden="true">
                  {completed ? '✅' : unlocked ? meta.emoji : ''}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <p className="hub-footer-note">Progress is saved automatically</p>
      </div>
    </div>
  )
}
