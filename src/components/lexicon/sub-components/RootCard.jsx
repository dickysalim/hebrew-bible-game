import { useEffect } from 'react'

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
 *   root      { id, sbl, gloss, strongs }
 *   isNew     boolean — true while the card is considered new this session;
 *             drives the pop entrance animation, coral border, and NEW badge
 *   popDelay  number  — ms delay before the pop animation fires (0 = immediate)
 *
 * Animation strategy: CSS animation-delay + `both` fill mode.
 * `backwards` fill keeps opacity:0 during the delay (no need for a hidden class).
 * `forwards` fill keeps the card visible after the animation ends.
 * JS timeout is only used to sync the pop sound with the visual pop.
 */
export default function RootCard({ root, isNew, popDelay = 0 }) {
  // Fire pop sound in sync with the visual entrance
  useEffect(() => {
    if (!isNew) return
    const timer = setTimeout(playRandomPop, popDelay)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={[
        'root-card',
        isNew ? 'root-card--new' : '',
        isNew ? 'root-card--pop-in' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isNew ? { '--pop-delay': `${popDelay}ms` } : undefined}
    >
      {/* NEW badge — shown while card is new this session */}
      {isNew && (
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
