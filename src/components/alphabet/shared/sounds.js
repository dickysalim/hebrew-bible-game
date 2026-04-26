import wordComplete from '../../../assets/audio/word_complete.mp3'
import verseComplete from '../../../assets/audio/verse_complete.mp3'

// Lazily create one Audio instance per sound to avoid overlap issues
let correctAudio = null
let levelCompleteAudio = null

/**
 * playCorrect — plays word_complete.mp3 on each correct answer.
 * Rewinds before playing so rapid-fire answers always fire.
 */
export function playCorrect() {
  if (!correctAudio) {
    correctAudio = new Audio(wordComplete)
    correctAudio.volume = 0.6
  }
  correctAudio.currentTime = 0
  correctAudio.play().catch(() => {/* autoplay blocked — ignore */})
}

/**
 * playLevelComplete — plays verse_complete.mp3 when a training level is finished.
 */
export function playLevelComplete() {
  if (!levelCompleteAudio) {
    levelCompleteAudio = new Audio(verseComplete)
    levelCompleteAudio.volume = 0.8
  }
  levelCompleteAudio.currentTime = 0
  levelCompleteAudio.play().catch(() => {/* autoplay blocked — ignore */})
}
