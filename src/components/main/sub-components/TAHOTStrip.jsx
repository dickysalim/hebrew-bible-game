/**
 * TAHOTStrip — renders a TAHOT gloss sentence for the active verse.
 *
 * Each word's `gloss` is joined into a readable English approximation.
 * The active word's gloss is highlighted so the player can see which
 * Hebrew word maps to which English meaning in real time.
 *
 * Props:
 *   words           — verse.words array: [{ id, sbl, gloss }, ...]
 *   activeWordIndex — index of the currently active word (highlights its gloss)
 */
export default function TAHOTStrip({ words, activeWordIndex }) {
  if (!words || words.length === 0) return null

  return (
    <div className="tahot-strip">
      <div className="tahot-label">TAHOT Gloss</div>
      <div className="tahot-text">
        {words.map((w, i) => {
          const gloss = w.gloss || w.id
          const isActive = i === activeWordIndex
          return isActive
            ? <span key={i} className="tahot-highlight">{gloss}</span>
            : <span key={i}>{gloss}</span>
        }).reduce((acc, el, i) => {
          // Join words with a space between them
          if (i === 0) return [el]
          return [...acc, ' ', el]
        }, [])}
      </div>
    </div>
  )
}

/**
 * Utility: build a plain gloss string from a words array.
 * Replaces getEsvText for contexts that need a flat string (e.g. Haber context).
 */
export function getGlossText(words) {
  if (!Array.isArray(words)) return ''
  return words.map(w => w.gloss || w.id).join(' ')
}
