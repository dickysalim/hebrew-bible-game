import { useEffect, useRef } from 'react'

export default function KeyboardGuide({ rows, keys, targetHeb, showActiveKey, wrongHebKeys, showSBLWord, showSBLLetter, expertMode, onToggleSBLWord, onToggleSBLLetter, onToggleExpertMode, onResetVerse }) {
  const keyMap = Object.fromEntries(keys.map(k => [k.latin, k]))
  const keyRefs = useRef({})
  const timerRef = useRef(null)

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

  return (
    <div className="keyboard-guide">
      <div className="kb-rows">
        {rows.map((row, ri) => (
          <div key={ri} className="kb-row">
            {row.map(latin => {
              const k = keyMap[latin]
              if (!k || !k.heb) {
                // Dim placeholder key (q, w)
                return (
                  <div key={latin} className="kb-key dim">
                    <div className="kb-heb" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {latin === 'q' ? '/' : "'"}
                    </div>
                  </div>
                )
              }
              const isTarget  = k.heb === targetHeb
              const isWrong   = wrongHebKeys.includes(k.heb)
              const isAnchor  = latin === 'f' || latin === 'j'
              const cls = (isTarget && showActiveKey) ? 'active-key' : isWrong ? 'wrong-key' : ''

              return (
                <div
                  key={latin}
                  className={`kb-key ${cls}`}
                  ref={el => { if (el) keyRefs.current[k.heb] = el }}
                >
                  {isAnchor && <div className="kb-anchor">{latin}</div>}
                  <div className="kb-heb">{k.heb}</div>
                  {/* Sound display removed as requested */}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      
      <div className="sbl-controls">
        <label className="sbl-checkbox">
          <input
            type="checkbox"
            checked={showSBLLetter}
            onChange={onToggleSBLLetter}
            disabled={expertMode}
          />
          <span style={expertMode ? { opacity: 0.4 } : undefined}>SBL Letter</span>
        </label>
        <label className="sbl-checkbox">
          <input
            type="checkbox"
            checked={showSBLWord}
            onChange={onToggleSBLWord}
            disabled={expertMode}
          />
          <span style={expertMode ? { opacity: 0.4 } : undefined}>SBL Word</span>
        </label>
        <label className={`sbl-checkbox sbl-checkbox--expert${expertMode ? ' sbl-checkbox--expert-active' : ''}`}>
          <input
            type="checkbox"
            checked={expertMode}
            onChange={onToggleExpertMode}
          />
          <span>Expert</span>
        </label>
      </div>
      <button className="sbl-reset-btn" onClick={onResetVerse}>↻ Reset Verse</button>
    </div>
  )
}
