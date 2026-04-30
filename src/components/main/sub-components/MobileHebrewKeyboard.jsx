import { useEffect, useRef } from 'react'
import { KEYS } from '../../../utils/hebrewData'

// Mirrors the desktop KEYS layout exactly — same rows, same order, same sofit forms.
// Derived from KEYS (which drives the desktop keyboard) so both stay in sync.
const ROWS = [
  // Row 1: e r t y u i o p → ק ר א ט ו ן ם פ  (q, w have no Hebrew mapping)
  KEYS.filter(k => ['e','r','t','y','u','i','o','p'].includes(k.latin) && k.heb).map(k => k.heb),
  // Row 2: a s d f g h j k l ; → ש ד ג כ ע י ח ל ך ף
  KEYS.filter(k => ['a','s','d','f','g','h','j','k','l',';'].includes(k.latin) && k.heb).map(k => k.heb),
  // Row 3: z x c v b n m , . → ז ס ב ה נ מ צ ת ץ
  KEYS.filter(k => ['z','x','c','v','b','n','m',',','.'].includes(k.latin) && k.heb).map(k => k.heb),
]

export default function MobileHebrewKeyboard({
  targetHeb,
  wrongHebKeys,
  showActiveKey,
  onKey,
  onSpace,
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
