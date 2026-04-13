import { useEffect, useRef } from 'react'

export default function KeyboardGuide({ rows, keys, targetHeb, wrongHebKeys }) {
  const keyMap = Object.fromEntries(keys.map(k => [k.latin, k]))
  const keyRefs = useRef({})

  // Pulse the target key after idling 5 s
  useEffect(() => {
    if (!targetHeb) return
    const timer = setTimeout(() => {
      Object.entries(keyRefs.current).forEach(([heb, el]) => {
        if (heb === targetHeb && el) {
          el.classList.add('kb-pulse')
          const remove = () => el.classList.remove('kb-pulse')
          el.addEventListener('animationend', remove, { once: true })
        }
      })
    }, 5000) // Changed from 10000 to 5000 (5 seconds)
    return () => clearTimeout(timer)
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
              const cls = isTarget ? 'active-key' : isWrong ? 'wrong-key' : ''

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
