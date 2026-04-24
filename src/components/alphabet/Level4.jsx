import { useState, useCallback, useMemo } from 'react'
import lettersData from '../../data/letters.json'
import StreakBar from './shared/StreakBar.jsx'
import { playCorrect } from './shared/sounds.js'

const LETTERS = lettersData.letters
const TARGET_STREAK = 10

// Curated Hebrew words: { word (with nikud for display), consonants (list of letter names in RTL order), sbl }
const WORD_LIST = [
  { display: 'בְּרֵאשִׁית', consonants: ['Bet', 'Resh', 'Aleph', 'Shin', 'Yod', 'Tav'], sbl: 'bĕrēʾšît' },
  { display: 'אֱלֹהִים',    consonants: ['Aleph', 'Lamed', 'He', 'Yod', 'Mem'],          sbl: 'ʾĕlōhîm' },
  { display: 'שָׁלוֹם',     consonants: ['Shin', 'Lamed', 'Vav', 'Mem'],                  sbl: 'šālôm' },
  { display: 'תּוֹרָה',      consonants: ['Tav', 'Vav', 'Resh', 'He'],                    sbl: 'tôrāh' },
  { display: 'מֶלֶךְ',       consonants: ['Mem', 'Lamed', 'Kaf'],                         sbl: 'melek' },
  { display: 'דָּבָר',       consonants: ['Dalet', 'Bet', 'Resh'],                        sbl: 'dābār' },
  { display: 'אֶרֶץ',       consonants: ['Aleph', 'Resh', 'Tsade'],                      sbl: 'ʾereṣ' },
  { display: 'יוֹם',         consonants: ['Yod', 'Vav', 'Mem'],                           sbl: 'yôm' },
  { display: 'לֵב',          consonants: ['Lamed', 'Bet'],                                sbl: 'lēb' },
  { display: 'נֶפֶשׁ',        consonants: ['Nun', 'Pe', 'Shin'],                          sbl: 'nepeš' },
  { display: 'כֹּהֵן',        consonants: ['Kaf', 'He', 'Nun'],                           sbl: 'kōhēn' },
  { display: 'עַם',           consonants: ['Ayin', 'Mem'],                                sbl: 'ʿam' },
  { display: 'בַּיִת',        consonants: ['Bet', 'Yod', 'Tav'],                          sbl: 'bayit' },
  { display: 'אוֹר',          consonants: ['Aleph', 'Vav', 'Resh'],                       sbl: 'ʾôr' },
  { display: 'שֶׁמֶשׁ',       consonants: ['Shin', 'Mem', 'Shin'],                        sbl: 'šemeš' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickWord(exclude) {
  const pool = WORD_LIST.filter((w) => w !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Level 4 — Word Spelling Challenge (10-streak)
 * User sees a Hebrew word and must click the letter names in order (RTL).
 * Wrong click → shake + streak reset.
 * 10 correct words in a row → complete.
 */
export default function Level4({ onComplete, onBack }) {
  const [word, setWord] = useState(() => pickWord(null))
  const [clickedSoFar, setClickedSoFar] = useState([])  // names clicked so far
  const [streak, setStreak] = useState(0)
  const [wordFeedback, setWordFeedback] = useState(null)  // null | 'correct' | 'wrong-click'
  const [lastWrongName, setLastWrongName] = useState(null)
  const [wordComplete, setWordComplete] = useState(false)  // word just completed — show SBL pop
  const [done, setDone] = useState(false)

  // Shuffled alphabet buttons (all 22 names)
  const shuffledNames = useMemo(() => shuffle(LETTERS.map((l) => l.name)), [word])

  const expectedNext = word.consonants[clickedSoFar.length]

  const handleLetterClick = useCallback((name) => {
    if (wordComplete || wordFeedback === 'wrong-click') return

    if (name === expectedNext) {
      playCorrect()
      const newClicked = [...clickedSoFar, name]
      setClickedSoFar(newClicked)
      setLastWrongName(null)

      if (newClicked.length === word.consonants.length) {
        // Word complete!
        const newStreak = streak + 1
        setWordFeedback('correct')
        setWordComplete(true)
        if (newStreak >= TARGET_STREAK) {
          setTimeout(() => setDone(true), 1600)
        } else {
          setTimeout(() => {
            setStreak(newStreak)
            setWord(pickWord(word))
            setClickedSoFar([])
            setWordFeedback(null)
            setWordComplete(false)
            setLastWrongName(null)
          }, 1600)
        }
      }
    } else {
      // Wrong letter
      setLastWrongName(name)
      setWordFeedback('wrong-click')
      setTimeout(() => {
        setStreak(0)
        setClickedSoFar([])
        setWordFeedback(null)
        setLastWrongName(null)
        // Keep same word, give another chance
      }, 1000)
    }
  }, [word, clickedSoFar, expectedNext, wordComplete, wordFeedback, streak])

  if (done) {
    return (
      <div className="alphabet-level-screen">
        <div className="level-complete-card">
          <div className="level-complete-icon" aria-hidden="true">👑</div>
          <h2 className="level-complete-title">Level 4 Complete!</h2>
          <p className="level-complete-desc">
            Master achieved — you can spell Hebrew words from memory!
          </p>
          <button className="level-complete-btn" onClick={onComplete}>
            Finish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="alphabet-level-screen alphabet-level-screen--l4">
      {/* Header */}
      <div className="level-header">
        <button className="level-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Back
        </button>
        <div className="level-header-title">
          <span className="level-tag">Level 4</span>
          <span className="level-desc">Spell the Word · 10-Streak</span>
        </div>
        <div className="level-progress-text streak-count-display">{streak}/{TARGET_STREAK}</div>
      </div>

      {/* Streak bar */}
      <StreakBar current={streak} total={TARGET_STREAK} label="Streak" />

      {/* Word Display */}
      <div className={`word-display-area${wordFeedback === 'wrong-click' ? ' word-display--shake' : ''}`}>
        <div className="word-display-hebrew" lang="he" dir="rtl">{word.display}</div>

        {/* Consonant slots — RTL reading order */}
        <div className="word-slots" dir="rtl">
          {word.consonants.map((name, i) => {
            const isClicked = i < clickedSoFar.length
            const isNext = i === clickedSoFar.length
            return (
              <div
                key={`${word.display}-${i}`}
                className={`word-slot${isClicked ? ' word-slot--filled' : ''}${isNext ? ' word-slot--next' : ''}`}
              >
                {isClicked ? clickedSoFar[i] : '?'}
              </div>
            )
          })}
        </div>

        {/* SBL pop on word complete */}
        {wordComplete && (
          <div className="word-sbl-pop" role="status" aria-live="polite">
            {word.sbl}
          </div>
        )}

        {/* Feedback */}
        {wordFeedback === 'wrong-click' && (
          <div className="level-reset-banner" role="alert">✗ Wrong letter — streak reset!</div>
        )}
      </div>

      {/* All 22 letter buttons */}
      <div className="word-spelling-grid" role="group" aria-label="Choose the next letter">
        {shuffledNames.map((name) => {
          const isWrong = wordFeedback === 'wrong-click' && name === lastWrongName
          const isUsedInWord = clickedSoFar.includes(name) && name !== expectedNext
          return (
            <button
              key={name}
              id={`l4-btn-${name}`}
              className={`spelling-btn${isWrong ? ' spelling-btn--wrong' : ''}${isUsedInWord ? ' spelling-btn--used' : ''}`}
              onClick={() => handleLetterClick(name)}
              disabled={!!wordComplete}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
