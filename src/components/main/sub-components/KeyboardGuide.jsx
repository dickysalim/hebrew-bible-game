import { useEffect, useRef } from 'react'

export default function KeyboardGuide({ rows, keys, targetHeb, showActiveKey, wrongHebKeys, showSBLWord, showSBLLetter, showGloss, showTAHOT, showNikud, expertMode, onToggleSBLWord, onToggleSBLLetter, onToggleGloss, onToggleTAHOT, onToggleNikud, onToggleExpertMode, onKey, onSpace }) {
  const keyMap = Object.fromEntries(keys.map(k => [k.latin, k]))
  const keyRefs = useRef({})
  const timerRef = useRef(null)
  const isTouchable = !!onKey

  // Pulse the target key every 5 s of idle, repeating until targetHeb changes
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

        el.classList.add('kb-pulse')

        const onEnd = () => {
          el.classList.remove('kb-pulse')
          cleanupAnimation = null
          if (!cancelled) schedulePulse()
        }
        el.addEventListener('animationend', onEnd, { once: true })
        cleanupAnimation = () => {
          el.removeEventListener('animationend', onEnd)
          el.classList.remove('kb-pulse')
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

  const handleKeyClick = (k) => {
    if (!onKey || !k?.heb) return
    onKey(k.heb)
  }

  return (
    <div className={`keyboard-guide${isTouchable ? ' keyboard-guide--touch' : ''}`}>
      <div className="sbl-controls">
        <label className="sbl-checkbox" onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={showSBLLetter} onChange={onToggleSBLLetter} disabled={expertMode} />
          <span style={expertMode ? { opacity: 0.4 } : undefined}>SBL Letter</span>
        </label>
        <label className="sbl-checkbox" onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={showSBLWord} onChange={onToggleSBLWord} disabled={expertMode} />
          <span style={expertMode ? { opacity: 0.4 } : undefined}>SBL Word</span>
        </label>
        <label className="sbl-checkbox" onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={showGloss} onChange={onToggleGloss} />
          <span>Word Gloss</span>
        </label>
        <label className="sbl-checkbox" onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={showTAHOT} onChange={onToggleTAHOT} />
          <span>TAHOT Strip</span>
        </label>
        <label className="sbl-checkbox" onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={showNikud} onChange={onToggleNikud} />
          <span>Nikud</span>
        </label>
        <label className={`sbl-checkbox sbl-checkbox--expert${expertMode ? ' sbl-checkbox--expert-active' : ''}`} onMouseDown={e => e.preventDefault()}>
          <input type="checkbox" checked={expertMode} onChange={onToggleExpertMode} />
          <span>Expert</span>
        </label>
      </div>

      <div className="kb-rows">
        {rows.map((row, ri) => (
          <div key={ri} className="kb-row">
            {row.map(latin => {
              const k = keyMap[latin]
              if (!k || !k.heb) {
                return (
                  <div key={latin} className="kb-key dim">
                    <div className="kb-heb" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {latin === 'q' ? '/' : "'"}
                    </div>
                  </div>
                )
              }
              const isTarget = k.heb === targetHeb
              const isWrong = wrongHebKeys.includes(k.heb)
              const isAnchor = latin === 'f' || latin === 'j'
              const cls = (isTarget && showActiveKey) ? 'active-key' : isWrong ? 'wrong-key' : ''

              return isTouchable ? (
                <button
                  key={latin}
                  className={`kb-key kb-key--btn ${cls}`}
                  ref={el => { if (el) keyRefs.current[k.heb] = el }}
                  onPointerDown={(e) => { e.preventDefault(); handleKeyClick(k) }}
                  type="button"
                >
                  {isAnchor && <div className="kb-anchor">{latin}</div>}
                  <div className="kb-heb">{k.heb}</div>
                </button>
              ) : (
                <div
                  key={latin}
                  className={`kb-key ${cls}`}
                  ref={el => { if (el) keyRefs.current[k.heb] = el }}
                >
                  {isAnchor && <div className="kb-anchor">{latin}</div>}
                  <div className="kb-heb">{k.heb}</div>
                </div>
              )
            })}
          </div>
        ))}
        {isTouchable && (
          <div className="kb-row kb-row--space">
            <button
              className="kb-key kb-key--space kb-key--btn"
              onPointerDown={(e) => { e.preventDefault(); onSpace?.() }}
              type="button"
            >
              Next Word ▸
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
