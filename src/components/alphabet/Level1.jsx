import { useState, useCallback } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'

const LETTERS = lettersData.letters // already in aleph-bet order

/** Pick 3 wrong options from the SBL pool, excluding the correct one */
function buildChoices(correct) {
  const pool = LETTERS.map((l) => l.sbl).filter((s) => s !== correct.sbl)
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  const all = [...shuffled, correct.sbl].sort(() => Math.random() - 0.5)
  return all.map((s) => ({ id: s, label: s }))
}

/**
 * Level 1 — SBL Sound Quiz (sequential, try-again on wrong)
 * Passes when all 22 letters answered correctly in order.
 */
export default function Level1({ onComplete, onBack }) {
  const [index, setIndex] = useState(0)
  const [choices, setChoices] = useState(() => buildChoices(LETTERS[0]))
  const [feedback, setFeedback] = useState(null)  // null | 'correct' | 'wrong'
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)

  const current = LETTERS[index]

  const handleChoice = useCallback((id) => {
    setSelected(id)
    if (id === current.sbl) {
      setFeedback('correct')
      setTimeout(() => {
        const next = index + 1
        if (next >= LETTERS.length) {
          setDone(true)
        } else {
          setIndex(next)
          setChoices(buildChoices(LETTERS[next]))
          setFeedback(null)
          setSelected(null)
        }
      }, 900)
    } else {
      setFeedback('wrong')
      setTimeout(() => {
        setFeedback(null)
        setSelected(null)
      }, 1000)
    }
  }, [index, current])

  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">🎉</div>
          <h2 className="level-complete-title">Level 1 Complete!</h2>
          <p className="level-complete-desc">
            You can read the SBL sound of every Hebrew letter.
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
          <span className="level-tag">Level 1</span>
          <span className="level-desc">SBL Sound Quiz</span>
        </div>
        <div className="level-progress-text">{index + 1} / {LETTERS.length}</div>
      </div>

      {/* Progress track */}
      <div className="level-progress-track" aria-label={`Letter ${index + 1} of ${LETTERS.length}`}>
        <div
          className="level-progress-fill"
          style={{ width: `${((index) / LETTERS.length) * 100}%` }}
        />
      </div>

      <div className="level-body">
        <QuizCard
          letter={current.letter}
          name={current.name}
          choices={choices}
          onChoice={handleChoice}
          feedback={feedback}
          selectedId={selected}
          correctId={current.sbl}
        />
      </div>
    </div>
  )
}
