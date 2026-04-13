import { useEffect, useState, useRef } from 'react'

export default function InsightCarousel({ insights, idx, onPrev, onNext }) {
  const [shouldCelebrate, setShouldCelebrate] = useState(false)
  const intervalRef = useRef(null)

  // Auto-slide timer: 6.5 seconds
  useEffect(() => {
    if (insights.length <= 1) return // No need to auto-slide if only one insight
    
    const startAutoSlide = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      // Start new interval
      intervalRef.current = setInterval(() => {
        onNext()
      }, 6500) // 6.5 seconds
    }
    
    startAutoSlide()
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [insights.length, onNext])

  // Trigger celebration animation when component mounts or when idx changes
  useEffect(() => {
    setShouldCelebrate(true)
    const timer = setTimeout(() => {
      setShouldCelebrate(false)
    }, 800) // Match animation duration
    
    return () => clearTimeout(timer)
  }, [idx])

  // Handle manual navigation - reset auto-slide timer
  const handlePrevClick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onPrev()
    
    // Restart auto-slide after a short delay
    setTimeout(() => {
      if (insights.length > 1) {
        intervalRef.current = setInterval(() => {
          onNext()
        }, 6500)
      }
    }, 100)
  }

  const handleNextClick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onNext()
    
    // Restart auto-slide after a short delay
    setTimeout(() => {
      if (insights.length > 1) {
        intervalRef.current = setInterval(() => {
          onNext()
        }, 6500)
      }
    }, 100)
  }

  const className = `insight-carousel${shouldCelebrate ? ' celebrate' : ''}`

  return (
    <div className={className}>
      <div className="ic-label">Hidden in plain sight</div>
      <div className="ic-body">
        <button className="ic-nav" onClick={handlePrevClick} aria-label="Previous insight">‹</button>
        <div className="ic-text">{insights[idx]}</div>
        <button className="ic-nav" onClick={handleNextClick} aria-label="Next insight">›</button>
      </div>
      <div className="ic-dots">
        {insights.map((_, i) => (
          <span key={i} className={`ic-dot ${i === idx ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
