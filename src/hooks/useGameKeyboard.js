import { useEffect } from 'react'
import { LATIN_TO_HEB } from '../utils/hebrewData'

export function useGameKeyboard(dispatch, resetProgress, resetDiscoveredRoots, clearCache, setIsTyping) {
  useEffect(() => {
    const handler = e => {
      // Don't intercept keypresses in text inputs or contentEditable (e.g. Haber conversation, verse notes)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return

      // Debug reset: Ctrl+Shift+R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        if (window.confirm('Reset all progress? This will clear all saved typing progress.')) {
          resetProgress()
          resetDiscoveredRoots()
          clearCache()
          dispatch({ type: 'RESET_PROGRESS' })
          console.log('Progress reset for debugging')
        }
        return
      }

      if (e.key === ' ')               { e.preventDefault(); dispatch({ type: 'SPACE' }) }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); dispatch({ type: 'MOVE_WORD', dir: 1 }) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'MOVE_WORD', dir: -1 }) }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: -1 }) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: 1 }) }
      else {
        const heb = LATIN_TO_HEB[e.key.toLowerCase()]
        if (heb) { setIsTyping(true); dispatch({ type: 'TYPE', heb }) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resetProgress])
}
