import { useEffect } from 'react'
import { LATIN_TO_HEB } from '../utils/hebrewData'

export function useGameKeyboard(dispatch, resetProgress, resetDiscoveredRoots, clearCache, setIsTyping) {
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return

      if (e.key === ' ')               { e.preventDefault(); dispatch({ type: 'SPACE' }) }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: -1 }) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: 1 }) }
      else {
        const heb = LATIN_TO_HEB[e.key.toLowerCase()]
        if (heb) { setIsTyping(true); dispatch({ type: 'TYPE', heb }) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch, resetProgress, setIsTyping])
}
