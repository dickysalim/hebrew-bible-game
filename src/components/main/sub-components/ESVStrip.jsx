/**
 * ESVStrip — renders the English Standard Version text with positional highlighting.
 *
 * The `esv` prop is an array of segments: [{ t: "text", w: wordIndex|null }, ...]
 * When `activeWordIndex` matches a segment's `w`, that segment gets highlighted.
 * No text searching needed — the mapping is baked into the data.
 */
export default function ESVStrip({ esv, activeWordIndex }) {
  // Handle both old string format (fallback) and new segments array
  if (typeof esv === 'string') {
    return (
      <div className="esv-strip">
        <div className="esv-label">English Standard Version</div>
        <div className="esv-text">{esv}</div>
      </div>
    )
  }

  const content = esv.map((seg, i) => {
    const isActive = seg.w !== null && seg.w === activeWordIndex
    return isActive
      ? <span key={i} className="esv-highlight">{seg.t}</span>
      : <span key={i}>{seg.t}</span>
  })

  return (
    <div className="esv-strip">
      <div className="esv-label">English Standard Version</div>
      <div className="esv-text">{content}</div>
    </div>
  )
}

/**
 * Utility: reconstruct the plain ESV text from a segments array.
 * Use this wherever you need the full ESV string (e.g., Haber context).
 */
export function getEsvText(esv) {
  if (typeof esv === 'string') return esv
  if (Array.isArray(esv)) return esv.map(s => s.t).join('')
  return ''
}
