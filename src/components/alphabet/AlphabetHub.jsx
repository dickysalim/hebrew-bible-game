import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Level1 from './Level1.jsx'
import Level2 from './Level2.jsx'
import Level3 from './Level3.jsx'
import Level4 from './Level4.jsx'
import Level5 from './Level5.jsx'
import Level6 from './Level6.jsx'
import Level7 from './Level7.jsx'

import { useProgressCache } from '../../contexts/ProgressCacheContext'

const STORAGE_KEY = 'alphabet_progress' // kept for migration fallback

const LEVEL_META = [
  {
    id: 1,
    title: 'SBL Sounds',
    desc: 'Match each letter to its sound transliteration',
    mechanic: 'Sequential · Try again on wrong',
    icon: '🔊',
  },
  {
    id: 2,
    title: 'Letter Names',
    desc: 'Name every letter in order — see sofit forms too',
    mechanic: 'Sequential · Reset to Aleph on wrong',
    icon: '📖',
  },
  {
    id: 3,
    title: '27-Streak',
    desc: 'Name all 27 forms in random order — 27 in a row',
    mechanic: 'Random shuffle · Streak resets on wrong',
    icon: '🔥',
  },
  {
    id: 4,
    title: 'Name → Hebrew',
    desc: 'See the English name — pick the Hebrew letter from 4 options',
    mechanic: 'Random shuffle · Streak resets on wrong',
    icon: '🔤',
  },
  {
    id: 5,
    title: 'Sound → Hebrew',
    desc: 'See the SBL sound — pick the Hebrew letter from 4 options',
    mechanic: 'Random shuffle · Streak resets on wrong',
    icon: '🔉',
  },
  {
    id: 6,
    title: 'Type the Symbol',
    desc: 'See the name — type the Hebrew key. 27 in a row',
    mechanic: 'Random shuffle · Space to advance · Try again on wrong',
    icon: '🎹',
  },
  {
    id: 7,
    title: 'Sound to Symbol',
    desc: 'See the SBL sound — type the Hebrew key. 27 in a row',
    mechanic: 'Random shuffle · Space to advance · Try again on wrong',
    icon: '👑',
  },
]

const ALL_LEVEL_IDS = LEVEL_META.map((m) => m.id)   // [1,2,3,4,5,6,7]

function defaultAlphabetProgress() {
  return Object.fromEntries(ALL_LEVEL_IDS.map((id) => [`level${id}`, false]))
}

// Read legacy localStorage (migration path)
function loadLocalAlphabetProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...defaultAlphabetProgress(), ...parsed }
    }
  } catch {}
  return defaultAlphabetProgress()
}

// ─── Hub grid (shown at /alphabet) ──────────────────────────────────────────
function HubGrid({ progress, onBack, onLevelSelect }) {
  const isUnlocked = (id) => (id === 1 ? true : !!progress[`level${id - 1}`])
  const completedCount = ALL_LEVEL_IDS.filter((n) => progress[`level${n}`]).length
  const total = ALL_LEVEL_IDS.length

  return (
    <div className="alphabet-hub-screen">
      <div className="menu-bg-letters" aria-hidden="true">
        <span lang="he">אבג</span>
        <span lang="he">דהו</span>
        <span lang="he">זחט</span>
        <span lang="he">יכל</span>
      </div>

      <div className="alphabet-hub-content">
        <div className="hub-header">
          <button className="hub-back-btn" onClick={onBack} aria-label="Back to main menu">
            ← Main Menu
          </button>
          <div className="hub-title-block">
            <div className="hub-hebrew-title" lang="he" dir="rtl">אלף-בית</div>
            <h1 className="hub-title">Hebrew Alphabet</h1>
            <p className="hub-subtitle">
              {completedCount === total
                ? 'All levels complete — well done!'
                : `${completedCount} of ${total} levels complete`}
            </p>
          </div>
        </div>

        <div className="hub-level-grid">
          {LEVEL_META.map((meta) => {
            const unlocked = isUnlocked(meta.id)
            const completed = progress[`level${meta.id}`]
            return (
              <button
                key={meta.id}
                id={`hub-level-${meta.id}`}
                className={`level-card${!unlocked ? ' level-card--locked' : ''}${completed ? ' level-card--done' : ''}`}
                onClick={() => unlocked && onLevelSelect(meta.id)}
                disabled={!unlocked}
                aria-label={`Level ${meta.id}: ${meta.title}${!unlocked ? ' — locked' : completed ? ' — completed' : ''}`}
              >
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

        <p className="hub-footer-note">Progress is saved to your account</p>
      </div>
    </div>
  )
}

// ─── Level wrapper — picks the right component by id ────────────────────────
const LEVEL_COMPONENTS = {
  1: Level1,
  2: Level2,
  3: Level3,
  4: Level4,
  5: Level5,
  6: Level6,
  7: Level7,
}

function LevelRoute({ id, onComplete, onBack }) {
  const LevelComponent = LEVEL_COMPONENTS[id]
  if (!LevelComponent) return null
  return <LevelComponent onComplete={onComplete} onBack={onBack} />
}

// ─── Root export ─────────────────────────────────────────────────────────────
export default function AlphabetHub({ onBack }) {
  const { cachedProgress, updateAlphabetProgress } = useProgressCache()

  // Initialize from Supabase cache, fall back to legacy localStorage
  const [progress, setProgress] = useState(() => {
    const ap = cachedProgress?.alphabetProgress
    if (ap && Object.keys(ap).length > 0) {
      return { ...defaultAlphabetProgress(), ...ap }
    }
    return loadLocalAlphabetProgress()
  })

  // Sync once when cache becomes ready (handles direct-URL refresh case)
  const hasSyncedRef = useRef(false)
  useEffect(() => {
    if (hasSyncedRef.current) return
    const ap = cachedProgress?.alphabetProgress
    if (ap !== undefined) {
      hasSyncedRef.current = true
      if (Object.keys(ap).length > 0) {
        setProgress({ ...defaultAlphabetProgress(), ...ap })
      }
    }
  }, [cachedProgress])

  const navigate = useNavigate()

  const handleLevelComplete = useCallback(
    (levelId) => {
      const key = `level${levelId}`
      const updated = { ...progress, [key]: true }
      setProgress(updated)
      updateAlphabetProgress(updated) // persists to Supabase
      navigate('/alphabet', { replace: true })
    },
    [progress, navigate, updateAlphabetProgress]
  )

  return (
    <Routes>
      {/* Hub grid */}
      <Route
        index
        element={
          <HubGrid
            progress={progress}
            onBack={onBack}
            onLevelSelect={(id) => navigate(`/alphabet/level/${id}`)}
          />
        }
      />
      {/* Individual levels — back button = browser back = /alphabet */}
      {ALL_LEVEL_IDS.map((id) => (
        <Route
          key={id}
          path={`level/${id}`}
          element={
            <LevelRoute
              id={id}
              onComplete={() => handleLevelComplete(id)}
              onBack={() => navigate('/alphabet')}
            />
          }
        />
      ))}
    </Routes>
  )
}
