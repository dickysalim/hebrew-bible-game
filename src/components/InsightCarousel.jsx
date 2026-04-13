import { useEffect, useState, useRef } from 'react'

export default function InsightCarousel({ insights, idx, onPrev, onNext, isNewCompletion }) {
  const [shouldCelebrate, setShouldCelebrate] = useState(false)
  const [slideDirection, setSlideDirection] = useState(null)
  const intervalRef = useRef(null)

  // Celebrate only on first mount when verse is newly completed
  useEffect(() => {
    if (!isNewCompletion) return
    setShouldCelebrate(true)
    const timer = setTimeout(() => setShouldCelebrate(false), 800)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-slide timer: 6.5 seconds
  useEffect(() => {
    if (insights.length <= 1) return

    intervalRef.current = setInterval(() => {
      onNext()
    }, 6500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [insights.length, onNext])

  // Track previous idx to determine slide direction on carousel navigation only
  const prevIdxRef = useRef(idx)

  useEffect(() => {
    if (prevIdxRef.current === idx) return

    const direction = idx > prevIdxRef.current ? 'left' : 'right'
    prevIdxRef.current = idx
    setSlideDirection(direction)

    const slideTimer = setTimeout(() => setSlideDirection(null), 400)
    return () => clearTimeout(slideTimer)
  }, [idx])

  const className = `insight-carousel${shouldCelebrate ? ' celebrate' : ''}`

  return (
    <div className={className}>
      <div className="ic-label">Hidden in plain sight</div>
      <div className="ic-body">
        <button className="ic-nav" onClick={onPrev} aria-label="Previous insight">‹</button>
        <div className={`ic-text ${slideDirection ? `slide-${slideDirection}` : ''}`}>
          {insights[idx]}
        </div>
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
