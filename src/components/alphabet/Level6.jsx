import { useState, useCallback, useRef, useEffect } from 'react'
import lettersData from '../../data/letters.json'
import { LATIN_TO_HEB } from '../../utils/hebrewData'
import TrainingKeyboard from './shared/TrainingKeyboard.jsx'
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
 * Level 6 intro — one-time screen before the streak begins.
 * Explains the name-to-symbol flip and the Space-to-advance mechanic.
 */
function LevelIntro({ onBegin }) {
  return (
    <div className="l1-level-intro">
      <div className="l1-intro-icon" aria-hidden="true">🎹</div>
      <h2 className="l1-intro-title">Type the Symbol</h2>
      <div className="l1-intro-body">
        <p>
          You've learned to <strong>recognize</strong> Hebrew letters. Now flip it around.
          You'll see the <strong>letter name</strong> — find the right key on your keyboard.
        </p>
        <div className="l1-intro-examples">
          <span><em>Mem</em> → <strong lang="he">מ</strong></span>
          <span><em>Shin</em> → <strong lang="he">ש</strong></span>
          <span><em>Aleph</em> → <strong lang="he">א</strong></span>
        </div>
        <p>
          22 base letters + 5 sofit forms = <strong>27 to master</strong>.
          Sofit forms live on their own keys — look for the <strong>✦ Sofit</strong> badge.
        </p>
        <div className="l2-intro-rule">
          <span className="l2-intro-rule-icon">⚠</span>
          <span>
            One wrong keystroke flashes red — try again on the same letter.
            When correct, press <strong>Space</strong> to move on.
          </span>
        </div>
      </div>
      <button className="intro-got-it-btn" onClick={onBegin}>
        Begin Typing →
      </button>
    </div>
  )
}

/**
 * Level 6 — Name → Type Symbol (27-streak)
 *
 * User sees the English letter name and presses the corresponding Hebrew
 * key on their physical keyboard. Correct → green highlight + "Press Space"
 * hint. Wrong → red flash on pressed key, try again on same letter.
 * Must reach a streak of 27 (all forms) to complete.
 */
export default function Level6({ onComplete, onBack }) {
  const [started,    setStarted]    = useState(false)
  const queueRef                    = useRef(buildQueue())
  const [queueIndex, setQueueIndex] = useState(0)
  const [streak,     setStreak]     = useState(0)
  const [phase,      setPhase]      = useState('waiting')  // 'waiting' | 'correct' | 'wrong'
  const [wrongHeb,   setWrongHeb]   = useState(null)
  const [done,       setDone]       = useState(false)

  const current = queueRef.current[queueIndex]

  // Advance to next item after a correct answer
  const advance = useCallback(() => {
    const newStreak = streak + 1
    if (newStreak >= TARGET_STREAK) {
      playLevelComplete()
      setDone(true)
      return
    }
    const nextIdx = queueIndex + 1
    if (nextIdx >= ALL_ITEMS.length) {
      // Exhausted queue — reshuffle and loop
      queueRef.current = buildQueue()
      setQueueIndex(0)
    } else {
      setQueueIndex(nextIdx)
    }
    setStreak(newStreak)
    setPhase('waiting')
  }, [streak, queueIndex])

  useEffect(() => {
    if (!started || done) return

    const onKey = (e) => {
      // Space advances only when answer is confirmed correct
      if (e.code === 'Space') {
        e.preventDefault()
        if (phase === 'correct') advance()
        return
      }

      if (phase !== 'waiting') return

      // Resolve physical key to Hebrew glyph
      const heb = LATIN_TO_HEB[e.key] ?? LATIN_TO_HEB[e.key.toLowerCase()]
      if (!heb) return

      if (heb === current.letter) {
        playCorrect()
        setPhase('correct')
      } else {
        // Flash the wrong key red, then let user try again — no streak penalty
        setWrongHeb(heb)
        setPhase('wrong')
        setTimeout(() => {
          setPhase('waiting')
          setWrongHeb(null)
        }, 700)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, done, phase, current, advance])

  // ─── Complete screen ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">🎹</div>
          <h2 className="level-complete-title">Level 6 Complete!</h2>
          <p className="level-complete-desc">
            Perfect 27-streak — you can recall every Hebrew symbol from its name!
          </p>
          <button className="level-complete-btn" onClick={onComplete}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ─── Shared header ────────────────────────────────────────────────────────
  const header = (
    <>
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 6</span>
          <span className="level-desc">Name → Symbol · 27-Streak</span>
        </div>
        {started && (
          <div className="level-progress-text streak-count-display">
            {streak}/{TARGET_STREAK}
          </div>
        )}
      </div>
      {started && <StreakBar current={streak} total={TARGET_STREAK} label="Streak" />}
    </>
  )

  // ─── One-time intro ───────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="alphabet-level-screen">
        {header}
        <LevelIntro onBegin={() => setStarted(true)} />
      </div>
    )
  }

  // ─── Active quiz ──────────────────────────────────────────────────────────
  return (
    <div className="alphabet-level-screen">
      {header}

      <div className="typing-level-body">
        {/* Sofit badge */}
        {current.isSofit && (
          <div className="l3-sofit-badge" aria-label="End-of-word (sofit) form">
            ✦ Sofit — end-of-word form
          </div>
        )}

        {/* Prompt — shows letter name */}
        <div
          className={`typing-prompt${
            phase === 'correct' ? ' typing-prompt--correct' : ''
          }${phase === 'wrong' ? ' typing-prompt--wrong' : ''}`}
        >
          <div className="typing-prompt-label">Find the key for</div>
          <div className="typing-prompt-value">{current.name}</div>
          {phase === 'correct' && (
            <div className="typing-correct-reveal" lang="he" aria-label="Correct!">
              {current.letter}
            </div>
          )}
        </div>

        {/* Space hint — appears after correct answer */}
        {phase === 'correct' && (
          <div className="typing-space-hint" role="status" aria-live="polite">
            Press <kbd>Space</kbd> to continue →
          </div>
        )}

        {/* Wrong key banner */}
        {phase === 'wrong' && (
          <div className="level-reset-banner" role="alert">
            ✗ Wrong key — try again!
          </div>
        )}

        {/* Keyboard — no target hint; only the wrong key is flashed red */}
        <TrainingKeyboard targetHeb={null} wrongHeb={wrongHeb} />
      </div>
    </div>
  )
}
