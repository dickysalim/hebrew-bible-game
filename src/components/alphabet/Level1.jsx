import { useState, useCallback } from 'react'
import lettersData from '../../data/letters.json'
import { playCorrect, playLevelComplete } from './shared/sounds.js'

const LETTERS = lettersData.letters

function buildChoices(correct) {
  const pool = LETTERS.map((l) => l.sbl).filter((s) => s !== correct.sbl)
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  return [...shuffled, correct.sbl].sort(() => Math.random() - 0.5).map((s) => ({ id: s, label: s }))
}

/**
 * One-time intro shown before the very first letter.
 * Explains the instinctual sound-picking strategy.
 */
function LevelIntro({ onBegin }) {
  return (
    <div className="l1-level-intro">
      <div className="l1-intro-icon" aria-hidden="true">🔊</div>
      <h2 className="l1-intro-title">SBL Sound Quiz</h2>
      <div className="l1-intro-body">
        <p>
          Each Hebrew letter has a <strong>name</strong> — and that name sounds like the letter itself.
        </p>
        <div className="l1-intro-examples">
          <span><em>Bet</em> → <strong>b</strong></span>
          <span><em>Mem</em> → <strong>m</strong></span>
          <span><em>Shin</em> → <strong>sh</strong></span>
        </div>
        <p>
          You'll see each letter with its mnemonic story, then pick the sound you think it makes.
          <strong> Trust your instincts</strong> — the name tells you!
        </p>
      </div>
      <button className="intro-got-it-btn" onClick={onBegin}>
        Let's Begin →
      </button>
    </div>
  )
}

/**
 * Level 1 — SBL Sound Quiz (sequential, try-again on wrong)
 * Single unified screen: glyph + mnemonic + sofit (if any) + quiz choices.
 * A one-time level intro is shown before the first letter.
 */
export default function Level1({ onComplete, onBack }) {
  const [started, setStarted]   = useState(false)
  const [index, setIndex]       = useState(0)
  const [choices, setChoices]   = useState(() => buildChoices(LETTERS[0]))
  const [feedback, setFeedback] = useState(null)   // null | 'correct' | 'wrong'
  const [selected, setSelected] = useState(null)
  const [done, setDone]         = useState(false)

  const current = LETTERS[index]

  const handleChoice = useCallback((id) => {
    if (feedback) return
    setSelected(id)
    if (id === current.sbl) {
      playCorrect()
      setFeedback('correct')
      setTimeout(() => {
        const next = index + 1
        if (next >= LETTERS.length) {
          playLevelComplete()
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
  }, [feedback, index, current])

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

  // Shared header — always visible
  const header = (
    <>
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 1</span>
          <span className="level-desc">SBL Sound Quiz</span>
        </div>
        {started && (
          <div className="level-progress-text">{index + 1} / {LETTERS.length}</div>
        )}
      </div>
      {started && (
        <div className="level-progress-track" aria-label={`Letter ${index + 1} of ${LETTERS.length}`}>
          <div
            className="level-progress-fill"
            style={{ width: `${(index / LETTERS.length) * 100}%` }}
          />
        </div>
      )}
    </>
  )

  // One-time level intro
  if (!started) {
    return (
      <div className="alphabet-level-screen">
        {header}
        <LevelIntro onBegin={() => setStarted(true)} />
      </div>
    )
  }

  // Per-letter: glyph + mnemonic + sofit + quiz — all on one screen
  return (
    <div className="alphabet-level-screen">
      {header}

      <div className="l1-letter-quiz">
        {/* Glyph + name */}
        <div className="l1-letter-block">
          <div className="l1-glyph" lang="he" dir="rtl">{current.letter}</div>
          <div className="intro-name-row">
            <span className="intro-letter-name">{current.name}</span>
          </div>
        </div>

        {/* Mnemonic */}
        <div className="l1-mnemonic">
          <span className="l1-keyword">{current.mnemonic.keyword}</span>
          <p className="l1-tip">{current.mnemonic.tip}</p>
          <div className="intro-word-example">
            <span lang="he" dir="rtl">{current.mnemonic.wordExample.hebrew}</span>
            <span className="intro-word-meaning">— {current.mnemonic.wordExample.meaning}</span>
          </div>
        </div>

        {/* Sofit panel — compact inline version */}
        {current.sofit && (
          <div className="l1-sofit-strip">
            <span className="l1-sofit-strip-label">✦ Sofit</span>
            <span className="l1-sofit-strip-glyphs">
              <span lang="he">{current.letter}</span>
              <span className="l1-sofit-strip-arrow">→</span>
              <span className="l1-sofit-strip-final" lang="he">{current.sofit.glyph}</span>
            </span>
            <span className="l1-sofit-strip-note">{current.sofit.explanation}</span>
          </div>
        )}

        {/* Quiz prompt */}
        <p className="l1-quiz-prompt">
          What sound does <strong>{current.name}</strong> make?
        </p>

        {/* Choices — constrained width, centered */}
        <div className="l1-quiz-choices">
          <div className="quiz-choices">
            {choices.map((choice) => {
              const isCorrect = feedback === 'correct' && choice.id === current.sbl
              const isWrong   = feedback === 'wrong'   && choice.id === selected
              return (
                <button
                  key={choice.id}
                  id={`l1-choice-${choice.id}`}
                  className={`quiz-btn${isCorrect ? ' quiz-btn--correct' : ''}${isWrong ? ' quiz-btn--wrong' : ''}`}
                  onClick={() => handleChoice(choice.id)}
                  disabled={!!feedback}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>
        </div>

        {feedback === 'wrong' && (
          <div className="level-reset-banner" role="alert">
            ✗ Not quite — try again!
          </div>
        )}
      </div>
    </div>
  )
}
