export default function ESVStrip({ esv, highlightPhrase }) {
  let content

  if (highlightPhrase) {
    const idx = esv.indexOf(highlightPhrase)
    if (idx !== -1) {
      content = (
        <>
          {esv.slice(0, idx)}
          <span className="esv-highlight">{highlightPhrase}</span>
          {esv.slice(idx + highlightPhrase.length)}
        </>
      )
    } else {
      content = esv
    }
  } else {
    content = esv
  }

  return (
    <div className="esv-strip">
      <div className="esv-label">English Standard Version</div>
      <div className="esv-text">{content}</div>
    </div>
  )
}
