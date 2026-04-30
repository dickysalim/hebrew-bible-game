import { useEffect, useRef } from 'react'
import { LETTER_SBL } from '../../../utils/hebrewData'

// Israeli-standard Hebrew phone layout
// Row 1 & 2: regular letters; Row 3: sofit forms + ס ע
const ROWS = [
  ['פ', 'ם', 'נ', 'מ', 'ל', 'כ', 'י', 'ט', 'ח', 'ז'],
  ['ו', 'ה', 'ד', 'ג', 'ב', 'א', 'ת', 'ש', 'ר', 'ק'],
  ['ס', 'ע', 'ץ', 'צ', 'ף', 'ן', 'ך'],
]

export default function MobileHebrewKeyboard({
  targetHeb,
  wrongHebKeys,
  showActiveKey,
  onKey,
  onSpace,
  showSBLLetter,
  showSBLWord,
}) {
  const keyRefs = useRef({})
  const timerRef = useRef(null)

  // Idle 5s pulse on target key — mirrors KeyboardGuide behaviour
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!targetHeb) return

    let cancelled = false
    let cleanupAnimation = null

    const schedulePulse = () => {
      timerRef.current = setTimeout(() => {
        if (cancelled) return
        const el = keyRefs.current[targetHeb]
        if (!el) { schedulePulse(); return }

        el.classList.add('mkb-pulse')

        const onEnd = () => {
          el.classList.remove('mkb-pulse')
          cleanupAnimation = null
          if (!cancelled) schedulePulse()
        }
        el.addEventListener('animationend', onEnd, { once: true })
        cleanupAnimation = () => {
          el.removeEventListener('animationend', onEnd)
          el.classList.remove('mkb-pulse')
        }
      }, 5000)
    }

    schedulePulse()

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
      cleanupAnimation?.()
    }
  }, [targetHeb])

  const renderKey = (heb) => {
    const isTarget = showActiveKey && heb === targetHeb
    const isWrong = wrongHebKeys?.includes(heb)
    const cls = `mkb-key${isTarget ? ' mkb-target' : ''}${isWrong ? ' mkb-wrong' : ''}`

    return (
      <button
        key={heb}
        className={cls}
        ref={el => { if (el) keyRefs.current[heb] = el }}
        onPointerDown={e => { e.preventDefault(); onKey(heb) }}
        aria-label={heb}
      >
        <span className="mkb-heb">{heb}</span>
        {showSBLLetter && LETTER_SBL[heb] && (
          <span className="mkb-sbl">{LETTER_SBL[heb]}</span>
        )}
      </button>
    )
  }

  return (
    <div className="mobile-keyboard">
      {ROWS.map((row, ri) => (
        <div key={ri} className="mkb-row">
          {row.map(heb => renderKey(heb))}
        </div>
      ))}

      <div className="mkb-row mkb-action-row">
        <button
          className="mkb-space-btn"
          onPointerDown={e => { e.preventDefault(); onSpace() }}
        >
          Next Word
        </button>
      </div>
    </div>
  )
}
