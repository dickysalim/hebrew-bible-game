import { useState, useCallback, useRef } from 'react'
import lettersData from '../../data/letters.json'
import StreakBar from './shared/StreakBar.jsx'
import { playCorrect, playLevelComplete } from './shared/sounds.js'

const LETTERS = lettersData.letters

// Sofit variants as standalone quiz items
const SOFIT_ITEMS = LETTERS
  .filter((l) => l.sofit)
  .map((l) => ({
    letter:  l.sofit.glyph,
    name:    l.sofit.quizLabel,   // e.g. "Mem (Sofit)"
    sbl:     l.sbl,
    isSofit: true,
  }))

// Full pool: 22 base + 5 sofit = 27
const ALL_ITEMS = [...LETTERS, ...SOFIT_ITEMS]
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

/**
 * Build 4 Hebrew-glyph choices for a given correct item.
 * Returns array of { id, label } where label is the Hebrew glyph.
 */
function buildChoices(correct) {
  const distractors = ALL_ITEMS
    .filter((l) => l.letter !== correct.letter)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((l) => ({ id: l.letter, label: l.letter }))
  return shuffle([
    ...distractors,
    { id: correct.letter, label: correct.letter },
  ])
}

/**
 * Level 4 intro — one-time screen before the streak begins.
 */
function LevelIntro({ onBegin }) {
  return (
    <div className="l1-level-intro">
      <div className="l1-intro-icon" aria-hidden="true">🔤</div>
      <h2 className="l1-intro-title">Name → Hebrew Letter</h2>
      <div className="l1-intro-body">
        <p>
          You know the names. Now prove it by picking the <strong>correct Hebrew glyph</strong>{' '}
          from four options when you see the English name.
        </p>
        <div className="l1-intro-examples">
          <span><em>Mem</em> → <strong lang="he">מ</strong></span>
          <span><em>Shin</em> → <strong lang="he">ש</strong></span>
          <span><em>Kaf (Sofit)</em> → <strong lang="he">ך</strong></span>
        </div>
        <p>
          22 base letters + 5 sofit forms = <strong>27 to master</strong>.
          Sofit forms are treated as their own independent letters.
        </p>
        <div className="l2-intro-rule">
          <span className="l2-intro-rule-icon">🔥</span>
          <span>
            Pick <strong>all 27 in a row</strong> without a mistake to complete the level.
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
 * Level 4 — English Name → Pick Hebrew Glyph (27-streak)
 *
 * User sees the English letter name and clicks the matching Hebrew glyph
 * from 4 multiple-choice buttons. Wrong answer → streak resets to 0, deck reshuffled.
 * Must reach a streak of 27 (all forms) to complete.
 */
export default function Level4({ onComplete, onBack }) {
  const [started, setStarted] = useState(false)
  const queueRef              = useRef(buildQueue())
  const [queueIndex, setQueueIndex] = useState(0)
  const [choices, setChoices]       = useState(() => buildChoices(queueRef.current[0]))
  const [feedback, setFeedback]     = useState(null)   // null | 'correct' | 'wrong'
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
    if (feedback) return   // already answered, wait for timeout
    setSelected(id)
    if (id === current.letter) {
      playCorrect()
      setFeedback('correct')
      setTimeout(() => nextLetter(streak + 1), 800)
    } else {
      setFeedback('wrong')
      setTimeout(() => {
        // Reset streak and reshuffle
        queueRef.current = buildQueue()
        setQueueIndex(0)
        setChoices(buildChoices(queueRef.current[0]))
        setFeedback(null)
        setSelected(null)
        setStreak(0)
      }, 1100)
    }
  }, [current, feedback, streak, nextLetter])

  // ─── Complete screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">🔤</div>
          <h2 className="level-complete-title">Level 4 Complete!</h2>
          <p className="level-complete-desc">
            Perfect 27-streak — you can match every Hebrew glyph to its English name!
          </p>
          <button className="level-complete-btn" onClick={onComplete}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ─── Shared header ─────────────────────────────────────────────────────────
  const header = (
    <div className="level-header">
      <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
        ← Back
      </button>
      <div className="level-header-title">
        <span className="level-tag">Level 4</span>
        <span className="level-desc">Name → Hebrew · 27-Streak</span>
      </div>
      {started && (
        <div className="level-progress-text streak-count-display">
          {streak}/{TARGET_STREAK}
        </div>
      )}
    </div>
  )

  // ─── One-time intro ────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="alphabet-level-screen">
        {header}
        <LevelIntro onBegin={() => setStarted(true)} />
      </div>
    )
  }

  // ─── Active quiz ───────────────────────────────────────────────────────────
  return (
    <div className="alphabet-level-screen">
      {header}

      <StreakBar current={streak} total={TARGET_STREAK} label="Streak" />

      <div className="level-body">
        {/* Sofit badge */}
        {current.isSofit && (
          <div className="l3-sofit-badge" aria-label="End-of-word (sofit) form">
            ✦ Sofit — end-of-word form
          </div>
        )}

        {/* Main quiz card — prompt is the English name, options are Hebrew glyphs */}
        <div className={`quiz-card${feedback === 'wrong' ? ' quiz-card--shake' : ''}`}>
          {/* Prompt */}
          <div className={`quiz-letter-display${feedback === 'correct' ? ' quiz-letter--correct' : ''}`}>
            <span className="quiz-glyph quiz-glyph--name">{current.name}</span>
          </div>

          {/* Feedback */}
          <div className={`quiz-feedback${feedback ? ' quiz-feedback--visible' : ''}`}>
            {feedback === 'correct' && <span className="quiz-feedback--correct">✓ Correct!</span>}
            {feedback === 'wrong'   && <span className="quiz-feedback--wrong">✗ Wrong — streak reset!</span>}
            {!feedback              && <span>&nbsp;</span>}
          </div>

          {/* Hebrew glyph choices */}
          <div className="quiz-choices quiz-choices--hebrew" role="group" aria-label="Pick the Hebrew letter">
            {choices.map((c) => {
              let btnClass = 'quiz-btn quiz-btn--hebrew'
              if (feedback && c.id === current.letter) btnClass += ' quiz-btn--correct'
              else if (feedback === 'wrong' && c.id === selected) btnClass += ' quiz-btn--wrong'
              return (
                <button
                  key={c.id}
                  id={`l4-choice-${c.id.codePointAt(0)}`}
                  className={btnClass}
                  onClick={() => handleChoice(c.id)}
                  disabled={!!feedback}
                  aria-pressed={selected === c.id}
                  lang="he"
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
