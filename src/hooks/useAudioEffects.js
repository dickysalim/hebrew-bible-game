import { useEffect, useRef } from 'react'
import wordCompleteAudio from '../assets/audio/word_complete.mp3'
import newWordAudio from '../assets/audio/new_word.mp3'
import verseCompleteAudio from '../assets/audio/verse_complete.mp3'
import typingSound1 from '../assets/audio/typing_sound1.mp3'
import typingSound2 from '../assets/audio/typing_sound2.mp3'
import typingSound3 from '../assets/audio/typing_sound3.mp3'

export function useAudioEffects(state, verseDone, currentVerseIdx) {
  const wordCompleteRef  = useRef(null)
  const newWordRef       = useRef(null)
  const verseCompleteRef = useRef(null)
  const typingSoundsRef  = useRef(null)
  const celebratedVerseRef = useRef(-1)
  const prevHighestRef = useRef(state.highestWordOrder)

  useEffect(() => {
    wordCompleteRef.current = new Audio(wordCompleteAudio)
    newWordRef.current = new Audio(newWordAudio)
    verseCompleteRef.current = new Audio(verseCompleteAudio)
    typingSoundsRef.current = [
      new Audio(typingSound1),
      new Audio(typingSound2),
      new Audio(typingSound3),
    ]
  }, [])

  useEffect(() => {
    if (state.completedWordSignal > 0 && state.lastCompletedWordId) {
      if (verseDone) return

      const wordId = state.lastCompletedWordId
      const encounterCount = state.wordEncounters[wordId] || 0

      if (encounterCount === 1 && newWordRef.current) {
        newWordRef.current.currentTime = 0
        newWordRef.current.play().catch(() => {})
      } else if (wordCompleteRef.current) {
        wordCompleteRef.current.currentTime = 0
        wordCompleteRef.current.play().catch(() => {})
      }
    }
  }, [state.completedWordSignal, state.lastCompletedWordId, state.wordEncounters])

  useEffect(() => {
    if (state.typingSignal > 0 && typingSoundsRef.current) {
      const sounds = typingSoundsRef.current
      const pick = sounds[Math.floor(Math.random() * sounds.length)]
      pick.currentTime = 0
      pick.play().catch(() => {})
    }
  }, [state.typingSignal])

  useEffect(() => {
    const hwAdvanced = state.highestWordOrder > prevHighestRef.current
    prevHighestRef.current = state.highestWordOrder

    if (verseDone && hwAdvanced && currentVerseIdx !== celebratedVerseRef.current && verseCompleteRef.current) {
      celebratedVerseRef.current = currentVerseIdx
      verseCompleteRef.current.currentTime = 0
      verseCompleteRef.current.play().catch(() => {})
    }
  }, [verseDone, currentVerseIdx, state.highestWordOrder])
}
