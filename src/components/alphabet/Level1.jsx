import { useState, useCallback } from 'react'
import lettersData from '../../data/letters.json'
import QuizCard from './shared/QuizCard.jsx'
import { playCorrect } from './shared/sounds.js'

const LETTERS = lettersData.letters

/** Pick 3 wrong SBL options, return 4-choice array */
function buildChoices(correct) {
  const pool = LETTERS.map((l) => l.sbl).filter((s) => s !== correct.sbl)
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  return [...shuffled, correct.sbl].sort(() => Math.random() - 0.5).map((s) => ({ id: s, label: s }))
}

/** Intro slide shown before each letter's sound quiz */
function IntroSlide({ letter, onContinue }) {
  return (
    <div className="intro-slide">
      {/* Large glyph + name */}
      <div className="intro-letter-block">
        <div className="intro-glyph" lang="he" dir="rtl">{letter.letter}</div>
        <div className="intro-name-row">
          <span className="intro-letter-name">{letter.name}</span>
          <span className="intro-sbl-badge">{letter.sbl}</span>
        </div>
      </div>

      {/* Mnemonic */}
      <div className="intro-mnemonic">
        <div className="intro-mnemonic-keyword">{letter.mnemonic.keyword}</div>
        <p className="intro-mnemonic-tip">{letter.mnemonic.tip}</p>
        <div className="intro-word-example">
          <span lang="he" dir="rtl">{letter.mnemonic.wordExample.hebrew}</span>
          <span className="intro-word-meaning">— {letter.mnemonic.wordExample.meaning}</span>
        </div>
      </div>

      {/* Sofit panel — only for the 5 final-form letters */}
      {letter.sofit && (
        <div className="intro-sofit-panel">
          <div className="intro-sofit-header">
            <span className="intro-sofit-label">✦ Sofit · Final Form</span>
          </div>
          <div className="intro-sofit-glyph-pair">
            <div className="intro-sofit-col">
              <span className="intro-sofit-glyph intro-sofit-glyph--standard" lang="he">{letter.letter}</span>
              <span className="intro-sofit-sub">Standard</span>
            </div>
            <span className="intro-sofit-arrow" aria-hidden="true">→</span>
            <div className="intro-sofit-col">
              <span className="intro-sofit-glyph intro-sofit-glyph--final" lang="he">{letter.sofit.glyph}</span>
              <span className="intro-sofit-sub">End of word</span>
            </div>
          </div>
          <p className="intro-sofit-explanation">{letter.sofit.explanation}</p>
        </div>
      )}

      <button className="intro-got-it-btn" onClick={onContinue}>
        Got it →
      </button>
    </div>
  )
}

/**
 * Level 1 — SBL Sound Quiz (sequential, try-again on wrong)
 * Each letter shows an intro slide first, then the sound quiz.
 * Passes when all 22 letters answered correctly in order.
 */
export default function Level1({ onComplete, onBack }) {
  const [index, setIndex]     = useState(0)
  const [phase, setPhase]     = useState('intro')   // 'intro' | 'quiz'
  const [choices, setChoices] = useState(() => buildChoices(LETTERS[0]))
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [done, setDone]       = useState(false)

  const current = LETTERS[index]

  const handleGotIt = useCallback(() => setPhase('quiz'), [])

  const handleChoice = useCallback((id) => {
    setSelected(id)
    if (id === current.sbl) {
      playCorrect()
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
          setPhase('intro')   // ← intro slide for next letter
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
      {/* Header — always visible */}
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 1</span>
          <span className="level-desc">
            {phase === 'intro' ? `Meet ${current.name}` : 'SBL Sound Quiz'}
          </span>
        </div>
        <div className="level-progress-text">{index + 1} / {LETTERS.length}</div>
      </div>

      {/* Progress track */}
      <div className="level-progress-track" aria-label={`Letter ${index + 1} of ${LETTERS.length}`}>
        <div
          className="level-progress-fill"
          style={{ width: `${(index / LETTERS.length) * 100}%` }}
        />
      </div>

      {/* Content — switches between intro and quiz */}
      {phase === 'intro' ? (
        <IntroSlide letter={current} onContinue={handleGotIt} />
      ) : (
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
      )}
    </div>
  )
}
