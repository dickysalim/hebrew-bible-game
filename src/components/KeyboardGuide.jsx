import { useEffect, useRef } from 'react'
import lettersFile from '../data/letters.json'

// Helper function to get letter name from Hebrew character (including final forms)
function getLetterName(hebrewChar) {
  // Handle final forms mapping
  const finalFormMap = {
    'ן': 'נ', // Nun sofit
    'ם': 'מ', // Mem sofit
    'ך': 'כ', // Kaf sofit
    'ץ': 'צ', // Tsadi sofit
    'ף': 'פ', // Pe sofit
  }
  
  const baseChar = finalFormMap[hebrewChar] || hebrewChar
  const letter = lettersFile.letters.find(l => l.letter === baseChar)
  return letter ? letter.name : ''
}

// Helper function to get letter SBL from Hebrew character (including final forms)
function getLetterSBL(hebrewChar) {
  // Handle final forms mapping
  const finalFormMap = {
    'ן': 'נ', // Nun sofit
    'ם': 'מ', // Mem sofit
    'ך': 'כ', // Kaf sofit
    'ץ': 'צ', // Tsadi sofit
    'ף': 'פ', // Pe sofit
  }
  
  const baseChar = finalFormMap[hebrewChar] || hebrewChar
  const letter = lettersFile.letters.find(l => l.letter === baseChar)
  return letter ? letter.sbl : ''
}

export default function KeyboardGuide({ rows, keys, targetHeb, wrongHebKeys, recentTypedLetter }) {
  const keyMap = Object.fromEntries(keys.map(k => [k.latin, k]))
  const keyRefs = useRef({})

  // Pulse the target key after idling 10 s
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
    }, 10000)
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
