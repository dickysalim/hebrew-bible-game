export default function InsightCarousel({ insights, idx, onPrev, onNext }) {
  return (
    <div className="insight-carousel">
      <div className="ic-label">Hidden in plain sight</div>
      <div className="ic-body">
        <button className="ic-nav" onClick={onPrev} aria-label="Previous insight">‹</button>
        <div className="ic-text">{insights[idx]}</div>
        <button className="ic-nav" onClick={onNext} aria-label="Next insight">›</button>
      </div>
      <div className="ic-dots">
        {insights.map((_, i) => (
          <span key={i} className={`ic-dot ${i === idx ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
