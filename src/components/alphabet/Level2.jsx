import { useState, useCallback } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'

const LETTERS = lettersData.letters

/** Build 4 name choices: 1 correct + 3 wrong */
function buildChoices(correctIndex) {
  const correct = LETTERS[correctIndex].name
  const pool = LETTERS
    .map((l) => l.name)
    .filter((n) => n !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  const all = [...pool, correct].sort(() => Math.random() - 0.5)
  return all.map((n) => ({ id: n, label: n }))
}

/**
 * Level 2 — Name Quiz (sequential, reset to Aleph on wrong)
 * Passes when all 22 letters answered in order without any mistake.
 */
export default function Level2({ onComplete, onBack }) {
  const [index, setIndex] = useState(0)
  const [choices, setChoices] = useState(() => buildChoices(0))
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  const [resetAnim, setResetAnim] = useState(false)

  const current = LETTERS[index]

  const handleChoice = useCallback((id) => {
    setSelected(id)
    if (id === current.name) {
      setFeedback('correct')
      setTimeout(() => {
        const next = index + 1
        if (next >= LETTERS.length) {
          setDone(true)
        } else {
          setIndex(next)
          setChoices(buildChoices(next))
          setFeedback(null)
          setSelected(null)
        }
      }, 900)
    } else {
      setFeedback('wrong')
      setResetAnim(true)
      setTimeout(() => {
        // Reset to Aleph
        setIndex(0)
        setChoices(buildChoices(0))
        setFeedback(null)
        setSelected(null)
        setResetAnim(false)
      }, 1200)
    }
  }, [index, current])

  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">🌟</div>
          <h2 className="level-complete-title">Level 2 Complete!</h2>
          <p className="level-complete-desc">
            You know all 22 Hebrew letter names in order — without a single mistake!
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
          <span className="level-tag">Level 2</span>
          <span className="level-desc">Name Quiz · No mistakes!</span>
        </div>
        <div className="level-progress-text">{index + 1} / {LETTERS.length}</div>
      </div>

      {/* Progress track */}
      <div className="level-progress-track">
        <div
          className={`level-progress-fill${resetAnim ? ' level-progress-fill--reset' : ''}`}
          style={{ width: `${(index / LETTERS.length) * 100}%` }}
        />
      </div>

      {/* Reset warning */}
      {resetAnim && (
        <div className="level-reset-banner" role="alert">
          ✗ Wrong — back to Aleph!
        </div>
      )}

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
