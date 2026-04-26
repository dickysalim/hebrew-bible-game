import { useState, useCallback } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'
import { playCorrect } from './shared/sounds.js'

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
 * Level 2 intro — shown once before the first letter.
 * Explains the name-quiz flow, the no-mistake rule, and the sofit awareness feature.
 */
function LevelIntro({ onBegin }) {
  return (
    <div className="l1-level-intro">
      <div className="l1-intro-icon" aria-hidden="true">📖</div>
      <h2 className="l1-intro-title">Letter Name Quiz</h2>
      <div className="l1-intro-body">
        <p>
          You already know the <strong>sounds</strong>. Now you'll learn the <strong>names</strong>.
          Every Hebrew letter has a name — and reading scholars use those names constantly.
        </p>
        <div className="l1-intro-examples">
          <span><em>א</em> → <strong>Aleph</strong></span>
          <span><em>מ</em> → <strong>Mem</strong></span>
          <span><em>ש</em> → <strong>Shin</strong></span>
        </div>
        <p>
          You'll go through all <strong>22 letters in alphabetical order</strong>. See the glyph,
          pick its name. When a letter has an end-of-word (sofit) form, you'll see
          <strong> both glyphs side-by-side</strong> — so you learn them together.
        </p>
        <div className="l2-intro-rule">
          <span className="l2-intro-rule-icon">⚠</span>
          <span>One wrong answer resets you back to <strong>Aleph</strong>. No mistakes allowed!</span>
        </div>
      </div>
      <button className="intro-got-it-btn" onClick={onBegin}>
        Let's Begin →
      </button>
    </div>
  )
}

/**
 * Sofit awareness panel — shown inline when a letter has a sofit form.
 * Purely informational; does not affect the quiz.
 */
function SofitPanel({ letter, sofit }) {
  return (
    <div className="l2-sofit-panel">
      <span className="l2-sofit-panel-label">✦ 2 Forms</span>
      <div className="l2-sofit-panel-glyphs">
        <div className="l2-sofit-panel-form">
          <span className="l2-sofit-panel-glyph" lang="he">{letter}</span>
          <span className="l2-sofit-panel-tag">Standard</span>
        </div>
        <span className="l2-sofit-panel-arrow">→</span>
        <div className="l2-sofit-panel-form">
          <span className="l2-sofit-panel-glyph l2-sofit-panel-glyph--final" lang="he">{sofit.glyph}</span>
          <span className="l2-sofit-panel-tag l2-sofit-panel-tag--sofit">End of word</span>
        </div>
      </div>
      <p className="l2-sofit-panel-note">{sofit.explanation}</p>
    </div>
  )
}

/**
 * Level 2 — Name Quiz (sequential, reset to Aleph on wrong)
 * Passes when all 22 letters answered in order without any mistake.
 * When a letter has a sofit form, an informational panel is shown
 * alongside the quiz so the learner sees both glyphs in context.
 */
export default function Level2({ onComplete, onBack }) {
  const [started, setStarted] = useState(false)
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
      playCorrect()
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

  // Shared header
  const header = (
    <>
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 2</span>
          <span className="level-desc">Name Quiz · No mistakes!</span>
        </div>
        {started && (
          <div className="level-progress-text">{index + 1} / {LETTERS.length}</div>
        )}
      </div>
      {started && (
        <div className="level-progress-track">
          <div
            className={`level-progress-fill${resetAnim ? ' level-progress-fill--reset' : ''}`}
            style={{ width: `${(index / LETTERS.length) * 100}%` }}
          />
        </div>
      )}
    </>
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

      {/* Reset warning */}
      {resetAnim && (
        <div className="level-reset-banner" role="alert">
          ✗ Wrong — back to Aleph!
        </div>
      )}

      <div className="level-body level-body--l2">
        {/* Sofit panel — shown above quiz when letter has a sofit form */}
        {current.sofit && (
          <SofitPanel letter={current.letter} sofit={current.sofit} />
        )}

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
