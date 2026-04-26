import { KEYS, KEYBOARD_ROWS } from '../../../utils/hebrewData'

/**
 * TrainingKeyboard — slim Hebrew keyboard for typing training levels.
 * Reuses the same KEYS / KEYBOARD_ROWS data and CSS as KeyboardGuide,
 * but strips all game-panel controls (SBL toggles, idle pulse timer, etc).
 *
 * Props:
 *   targetHeb — Hebrew glyph whose key should be highlighted green (or null)
 *   wrongHeb  — Hebrew glyph whose key should be highlighted red (or null)
 */
export default function TrainingKeyboard({ targetHeb, wrongHeb }) {
  const keyMap = Object.fromEntries(KEYS.map((k) => [k.latin, k]))

  return (
    <div className="training-keyboard">
      <div className="kb-rows">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="kb-row">
            {row.map((latin) => {
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
              const isWrong  = k.heb === wrongHeb
              const isAnchor = latin === 'f' || latin === 'j'
              const cls = isTarget ? 'active-key' : isWrong ? 'wrong-key' : ''

              return (
                <div key={latin} className={`kb-key ${cls}`}>
                  {isAnchor && <div className="kb-anchor">{latin}</div>}
                  <div className="kb-heb">{k.heb}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
