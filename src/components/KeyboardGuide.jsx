import { useEffect, useRef } from 'react'

export default function KeyboardGuide({ rows, keys, targetHeb, showActiveKey, wrongHebKeys }) {
  const keyMap = Object.fromEntries(keys.map(k => [k.latin, k]))
  const keyRefs = useRef({})
  const timerRef = useRef(null)

  // Pulse the target key every 5 s of idle, repeating until targetHeb changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!targetHeb) return

    const schedulePulse = () => {
      timerRef.current = setTimeout(() => {
        const el = keyRefs.current[targetHeb]
        if (el) {
          el.classList.add('kb-pulse')
          el.addEventListener('animationend', () => {
            el.classList.remove('kb-pulse')
            schedulePulse()
          }, { once: true })
        } else {
          schedulePulse()
        }
      }, 5000)
    }

    schedulePulse()

    return () => clearTimeout(timerRef.current)
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
      
    </div>
  )
}
