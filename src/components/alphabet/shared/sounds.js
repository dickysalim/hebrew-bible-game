import wordComplete from '../../../assets/audio/word_complete.mp3'

// Lazily create one Audio instance and reuse it to avoid overlap issues
let audio = null

/**
 * playCorrect — plays word_complete.mp3 on each correct answer.
 * Rewinds before playing so rapid-fire answers always fire.
 */
export function playCorrect() {
  if (!audio) {
    audio = new Audio(wordComplete)
    audio.volume = 0.6
  }
  audio.currentTime = 0
  audio.play().catch(() => {/* autoplay blocked — ignore */})
}
