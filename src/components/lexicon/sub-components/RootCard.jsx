import { useEffect, useRef, useState } from 'react'

// Pre-import all 4 pop sounds as modules (Vite handles asset URLs)
import pop1 from '../../../assets/audio/pop-1.mp3'
import pop2 from '../../../assets/audio/pop-2.mp3'
import pop3 from '../../../assets/audio/pop-3.mp3'
import pop4 from '../../../assets/audio/pop-4.mp3'

const POP_SOUNDS = [pop1, pop2, pop3, pop4]

function playRandomPop() {
  const src = POP_SOUNDS[Math.floor(Math.random() * POP_SOUNDS.length)]
  const audio = new Audio(src)
  audio.volume = 0.45
  audio.play().catch(() => {})
}

/**
 * RootCard — a single collectible card for a Hebrew root.
 *
 * Props:
 *   root          { id, sbl, gloss, strongs }
 *   isNew         boolean — card was just discovered this session
 *   popDelay      number  — ms delay before the pop animation fires (0 = immediate)
 *   highlighted   boolean — whether to show the "new" highlight border/badge
 */
export default function RootCard({ root, isNew, popDelay = 0, highlighted }) {
  const [popped, setPopped] = useState(!isNew) // already-collected cards start visible
  // Freeze the delay at mount time so prop changes never cancel the pending timer
  const popDelayRef = useRef(popDelay)

  useEffect(() => {
    if (!isNew) return

    const timer = setTimeout(() => {
      setPopped(true)
      playRandomPop()
    }, popDelayRef.current)

    // Only cancel if the component unmounts before the timer fires
    return () => clearTimeout(timer)
  }, [isNew]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={[
        'root-card',
        isNew && highlighted ? 'root-card--new' : '',
        isNew ? (popped ? 'root-card--popped' : 'root-card--hidden') : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* NEW badge */}
      {isNew && highlighted && (
        <div className="root-card__badge">NEW</div>
      )}

      {/* Hebrew root — large, RTL */}
      <div className="root-card__hebrew" dir="rtl" lang="he">
        {root.id}
      </div>

      {/* SBL transliteration */}
      <div className="root-card__sbl">{root.sbl}</div>

      {/* Gloss */}
      <div className="root-card__gloss">{root.gloss}</div>

      {/* Strong's number footer */}
      {root.strongs && (
        <div className="root-card__strongs">{root.strongs}</div>
      )}
    </div>
  )
}
