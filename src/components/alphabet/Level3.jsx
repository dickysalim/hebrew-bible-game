import { useState, useCallback, useRef } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'
import StreakBar from './shared/StreakBar.jsx'

const LETTERS = lettersData.letters
const TARGET_STREAK = 22

/** Fisher-Yates shuffle */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue() {
  return shuffle(LETTERS)
}

/** Build 4 name choices from shuffled queue current */
function buildChoices(correct) {
  const pool = LETTERS
    .map((l) => l.name)
    .filter((n) => n !== correct.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [...pool, correct.name].sort(() => Math.random() - 0.5).map((n) => ({ id: n, label: n }))
}

/**
 * Level 3 — Random shuffle, 22-streak required
 * Wrong answer resets streak AND reshuffles queue.
 */
export default function Level3({ onComplete, onBack }) {
  const queueRef = useRef(buildQueue())
  const [queueIndex, setQueueIndex] = useState(0)
  const [choices, setChoices] = useState(() => buildChoices(queueRef.current[0]))
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)

  const current = queueRef.current[queueIndex]

  const nextLetter = useCallback((newStreak) => {
    if (newStreak >= TARGET_STREAK) {
      setDone(true)
      return
    }
    const nextIdx = queueIndex + 1
    // If we've exhausted the queue, reshuffle (shouldn't normally happen at 22-streak)
    if (nextIdx >= LETTERS.length) {
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
      setFeedback('correct')
      setTimeout(() => nextLetter(streak + 1), 800)
    } else {
      setFeedback('wrong')
      setTimeout(() => {
        // Reset streak and reshuffle queue
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
            Perfect 22-letter streak — you know every letter cold!
          </p>
          <button className="level-complete-btn" onClick={onComplete}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="alphabet-level-screen">
      {/* Header */}
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 3</span>
          <span className="level-desc">22-Streak Challenge</span>
        </div>
        <div className="level-progress-text streak-count-display">{streak}/{TARGET_STREAK}</div>
      </div>

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
