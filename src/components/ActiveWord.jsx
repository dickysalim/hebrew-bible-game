export default function ActiveWord({ wordId, sbl, typedCount, done, letterTypes, letterSBL }) {
  const letters = wordId.split('')

  return (
    <div className="active-word-panel">
      <div className="aw-letters">
        {letters.map((ch, i) => {
          const isTyped = i < typedCount
          const isCurrent = i === typedCount && !done
          const type = letterTypes[i] || 'root'
          const charClass = isTyped
            ? `typed type-${type}`
            : isCurrent
              ? 'current'
              : 'ghost'

          return (
            <div key={i} className="aw-letter-col">
              <div className={`aw-char ${charClass}`}>{ch}</div>
              <div className={`aw-sound ${isTyped ? 'visible' : ''}`}>
                {isTyped ? (letterSBL[ch] || '') : '·'}
              </div>
            </div>
          )
        })}
      </div>

      {done && (
        <div className="aw-sbl">{sbl}</div>
      )}
    </div>
  )
}
