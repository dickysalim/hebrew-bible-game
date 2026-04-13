import { useEffect, useState, useRef } from 'react'

export default function InsightCarousel({ insights, idx, onPrev, onNext }) {
  const [shouldCelebrate, setShouldCelebrate] = useState(false)
  const [slideDirection, setSlideDirection] = useState(null)
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

  // Track previous idx to determine slide direction
  const prevIdxRef = useRef(idx)
  
  // Trigger celebration animation when component mounts or when idx changes
  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const rafId = requestAnimationFrame(() => {
      setShouldCelebrate(true)
    })
    
    const timer = setTimeout(() => {
      setShouldCelebrate(false)
    }, 800) // Match animation duration
    
    // Determine slide direction based on idx change
    if (prevIdxRef.current !== idx) {
      const direction = idx > prevIdxRef.current ? 'left' : 'right'
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const directionRafId = requestAnimationFrame(() => {
        setSlideDirection(direction)
      })
      
      // Clear slide direction after animation completes
      const slideTimer = setTimeout(() => {
        setSlideDirection(null)
      }, 400) // Match slide animation duration
      
      prevIdxRef.current = idx
      return () => {
        cancelAnimationFrame(rafId)
        cancelAnimationFrame(directionRafId)
        clearTimeout(timer)
        clearTimeout(slideTimer)
      }
    }
    
    prevIdxRef.current = idx
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [idx])

  // Handle manual navigation - reset auto-slide timer
  const handlePrevClick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setSlideDirection('right') // Previous button slides right
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
    setSlideDirection('left') // Next button slides left
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
        <div className={`ic-text ${slideDirection ? `slide-${slideDirection}` : ''}`}>
          {insights[idx]}
        </div>
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
