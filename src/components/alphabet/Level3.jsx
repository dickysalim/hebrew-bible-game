import { useState, useCallback, useRef } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'
import StreakBar from './shared/StreakBar.jsx'
import { playCorrect, playLevelComplete } from './shared/sounds.js'

const LETTERS = lettersData.letters

// Build 5 sofit variants as fully independent quiz entries
const SOFIT_ITEMS = LETTERS
  .filter((l) => l.sofit)
  .map((l) => ({
    letter:  l.sofit.glyph,
    name:    l.sofit.quizLabel,   // e.g. "Mem (Sofit)"
    sbl:     l.sbl,
    isSofit: true,
  }))

// Full pool: 22 standard + 5 sofit = 27 independent items
const ALL_ITEMS = [...LETTERS, ...SOFIT_ITEMS]

// Streak target equals the full pool — must name every form without a single mistake
const TARGET_STREAK = ALL_ITEMS.length  // 27

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue() {
  return shuffle(ALL_ITEMS)
}

/** Build 4 name choices from the full 27-item pool */
function buildChoices(correct) {
  const pool = ALL_ITEMS
    .map((l) => l.name)
    .filter((n) => n !== correct.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [...pool, correct.name]
    .sort(() => Math.random() - 0.5)
    .map((n) => ({ id: n, label: n }))
}

/**
 * Level 3 intro — shown once before the streak begins.
 * Explains the 27-form pool, sofit as standalone, and the streak mechanic.
 */
function LevelIntro({ onBegin }) {
  return (
    <div className="l1-level-intro">
      <div className="l1-intro-icon" aria-hidden="true">🔥</div>
      <h2 className="l1-intro-title">27-Form Streak Challenge</h2>
      <div className="l1-intro-body">
        <p>
          You've learned the sounds and the names. Now it's time to <strong>prove it</strong> —
          with no hints, no order, no help.
        </p>
        <div className="l1-intro-examples">
          <span>22 base letters</span>
          <span>+</span>
          <span>5 sofit forms</span>
          <span>=</span>
          <span><strong>27 to master</strong></span>
        </div>
        <p>
          Every letter and every sofit variant appears in a <strong>random shuffle</strong>.
          Sofit letters are treated as their own independent forms — you must distinguish
          <em> Mem</em> from <em> Mem (Sofit)</em> by shape alone.
        </p>
        <div className="l2-intro-rule">
          <span className="l2-intro-rule-icon">🔥</span>
          <span>
            Name <strong>all 27 in a row</strong> without a mistake to complete the level.
            One wrong answer resets your streak to zero and reshuffles the deck.
          </span>
        </div>
      </div>
      <button className="intro-got-it-btn" onClick={onBegin}>
        Begin Streak →
      </button>
    </div>
  )
}

/**
 * Level 3 — Random shuffle, 27-streak required (all 27 forms)
 * Pool is 27 items: 22 standard letters + 5 sofit variants.
 * Sofit letters are standalone — "Mem (Sofit)" is a distinct answer from "Mem".
 * Wrong answer resets streak AND reshuffles queue.
 */
export default function Level3({ onComplete, onBack }) {
  const [started, setStarted] = useState(false)
  const queueRef   = useRef(buildQueue())
  const [queueIndex, setQueueIndex] = useState(0)
  const [choices, setChoices]       = useState(() => buildChoices(queueRef.current[0]))
  const [feedback, setFeedback]     = useState(null)
  const [selected, setSelected]     = useState(null)
  const [streak, setStreak]         = useState(0)
  const [done, setDone]             = useState(false)

  const current = queueRef.current[queueIndex]

  const nextLetter = useCallback((newStreak) => {
    if (newStreak >= TARGET_STREAK) {
      playLevelComplete()
      setDone(true)
      return
    }
    const nextIdx = queueIndex + 1
    if (nextIdx >= ALL_ITEMS.length) {
      // Exhausted queue — reshuffle
      queueRef.current = buildQueue()
      setQueueIndex(0)
      setChoices(buildChoices(queueRef.current[0]))
    } else {
      setQueueIndex(nextIdx)
      setChoices(buildChoices(queueRef.current[nextIdx]))
    }
    setFeedback(null)
    setSelected(null)
    setStreak(newStreak)
  }, [queueIndex])

  const handleChoice = useCallback((id) => {
    setSelected(id)
    if (id === current.name) {
      playCorrect()
      setFeedback('correct')
      setTimeout(() => nextLetter(streak + 1), 800)
    } else {
      setFeedback('wrong')
      setTimeout(() => {
        queueRef.current = buildQueue()
        setQueueIndex(0)
        setChoices(buildChoices(queueRef.current[0]))
        setFeedback(null)
        setSelected(null)
        setStreak(0)
      }, 1100)
    }
  }, [current, streak, nextLetter])

  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">🔥</div>
          <h2 className="level-complete-title">Level 3 Complete!</h2>
          <p className="level-complete-desc">
            Perfect 27-streak — all 22 base letters and all 5 sofit forms named correctly in a row!
          </p>
          <button className="level-complete-btn" onClick={onComplete}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // Shared header
  const header = (
    <div className="level-header">
      <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
        ← Back
      </button>
      <div className="level-header-title">
        <span className="level-tag">Level 3</span>
        <span className="level-desc">27-Streak · 27 Forms</span>
      </div>
      {started && (
        <div className="level-progress-text streak-count-display">{streak}/{TARGET_STREAK}</div>
      )}
    </div>
  )

  // One-time intro
  if (!started) {
    return (
      <div className="alphabet-level-screen">
        {header}
        <LevelIntro onBegin={() => setStarted(true)} />
      </div>
    )
  }

  return (
    <div className="alphabet-level-screen">
      {header}

      {/* Streak bar */}
      <StreakBar current={streak} total={TARGET_STREAK} label="Streak" />

      <div className="level-body">
        <QuizCard
          letter={current.letter}
          name={null}
          choices={choices}
          onChoice={handleChoice}
          feedback={feedback}
          selectedId={selected}
          correctId={current.name}
        />
      </div>
    </div>
  )
}
