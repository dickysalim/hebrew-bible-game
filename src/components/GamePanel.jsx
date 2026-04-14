import { useReducer, useEffect, useRef } from 'react'
import versesFile from '../data/verses/genesis-1.json'
import wordsData from '../data/words.json'
import wordCompleteAudio from '../assets/audio/word_complete.mp3'
import newWordAudio from '../assets/audio/new_word.mp3'
import verseCompleteAudio from '../assets/audio/verse_complete.mp3'
import typingSound1 from '../assets/audio/typing_sound1.mp3'
import typingSound2 from '../assets/audio/typing_sound2.mp3'
import typingSound3 from '../assets/audio/typing_sound3.mp3'
import { LETTER_SBL, KEYS, KEYBOARD_ROWS, LATIN_TO_HEB } from '../utils/hebrewData'
import VerseScroll from './VerseScroll'
import InsightCarousel from './InsightCarousel'
import ESVStrip from './ESVStrip'
import KeyboardGuide from './KeyboardGuide'
import WordDefinition from './WordDefinition'

const verses = versesFile.verses

// ─── Reducer helpers ──────────────────────────────────────────────────────────

const wkey = (vi, wi) => `${vi}-${wi}`
const wordLen = (vi, wi) => verses[vi]?.words[wi]?.id?.length ?? 0
const getTyped = (counts, vi, wi) => counts[wkey(vi, wi)] ?? 0
const isDone = (counts, vi, wi) => getTyped(counts, vi, wi) >= wordLen(vi, wi)
const isVerseDone = (counts, vi) =>
  verses[vi]?.words.every((_, wi) => isDone(counts, vi, wi)) ?? false

// Index of first incomplete word in a verse; -1 if all done
const firstIncomplete = (counts, vi) =>
  verses[vi]?.words.findIndex((_, wi) => !isDone(counts, vi, wi)) ?? -1

// ─── Game reducer ─────────────────────────────────────────────────────────────

const initialState = {
  currentVerse: 0,
  activeWordIdx: 0,       // null = nothing selected
  typedCounts: {},
  wordEncounters: {},     // tracks how many times each word has been completed
  highestVerse: 0,
  errorCount: 0,
  wrongHebKeys: [],
  carouselIdxMap: {},
  completedWordSignal: 0, // increments → triggers word_complete audio
  lastCompletedWordId: null, // tracks the last completed word for sound logic
  typingSignal: 0,        // increments on correct keypress → triggers typing sound
  recentTypedLetter: null, // tracks most recently typed Hebrew letter
}

function reducer(state, action) {
  const { currentVerse, activeWordIdx, typedCounts, highestVerse } = state

  switch (action.type) {

    case 'TYPE': {
      // Auto-select first incomplete word if nothing is active
      let wi = activeWordIdx
      if (wi === null) {
        wi = firstIncomplete(typedCounts, currentVerse)
        if (wi === -1) return state
      }

      const wordId = verses[currentVerse].words[wi].id
      const typed = getTyped(typedCounts, currentVerse, wi)
      if (typed >= wordId.length) return state

      if (action.heb === wordId[typed]) {
        const newTyped = typed + 1
        const newCounts = { ...typedCounts, [wkey(currentVerse, wi)]: newTyped }
        const wordDone = newTyped >= wordId.length
        const verseDone = wordDone && verses[currentVerse].words.every((_, i) =>
          i === wi ? true : isDone(newCounts, currentVerse, i)
        )
        // Update wordEncounters if word is completed
        let newWordEncounters = state.wordEncounters
        if (wordDone) {
          const currentCount = state.wordEncounters[wordId] || 0
          newWordEncounters = { ...state.wordEncounters, [wordId]: currentCount + 1 }
        }
        
        return {
          ...state,
          activeWordIdx: wi,
          typedCounts: newCounts,
          wordEncounters: newWordEncounters,
          errorCount: 0,
          wrongHebKeys: [],
          highestVerse: verseDone ? Math.max(highestVerse, currentVerse + 1) : highestVerse,
          completedWordSignal: wordDone ? state.completedWordSignal + 1 : state.completedWordSignal,
          lastCompletedWordId: wordDone ? wordId : state.lastCompletedWordId,
          typingSignal: state.typingSignal + 1,
          recentTypedLetter: action.heb, // Store the typed letter
        }
      }

      // Wrong key
      const newWrong = state.wrongHebKeys.includes(action.heb)
        ? state.wrongHebKeys
        : [...state.wrongHebKeys, action.heb]
      return { ...state, activeWordIdx: wi, errorCount: state.errorCount + 1, wrongHebKeys: newWrong }
    }

    case 'SPACE': {
      if (activeWordIdx === null) return state

      const typed = getTyped(typedCounts, currentVerse, activeWordIdx)
      const wLen  = wordLen(currentVerse, activeWordIdx)

      // Partially typed — ignore space
      if (typed > 0 && typed < wLen) return state

      // Unstarted word — deselect
      if (typed === 0) return { ...state, activeWordIdx: null }

      // Done word — jump to first incomplete, or next verse
      const fInc = firstIncomplete(typedCounts, currentVerse)
      if (fInc !== -1) {
        return { ...state, activeWordIdx: fInc, errorCount: 0, wrongHebKeys: [] }
      }
      if (isVerseDone(typedCounts, currentVerse) && currentVerse < verses.length - 1) {
        const nextVi = currentVerse + 1
        return {
          ...state,
          currentVerse: nextVi,
          activeWordIdx: 0,
          highestVerse: Math.max(highestVerse, nextVi),
          errorCount: 0,
          wrongHebKeys: [],
        }
      }
      return state
    }

    case 'MOVE_WORD': {
      // dir +1 = left arrow (forward in RTL), -1 = right arrow (backward)
      const fInc = firstIncomplete(typedCounts, currentVerse)
      const limit = fInc === -1 ? verses[currentVerse].words.length - 1 : fInc

      // Nothing selected: activate first incomplete
      if (activeWordIdx === null) {
        return fInc === -1 ? state : { ...state, activeWordIdx: fInc }
      }

      const nextWi = activeWordIdx + action.dir
      if (action.dir === 1  && nextWi > limit) return state  // can't skip past first ghost
      if (action.dir === -1 && nextWi < 0)     return state
      return { ...state, activeWordIdx: nextWi, errorCount: 0, wrongHebKeys: [] }
    }

    case 'MOVE_VERSE': {
      const nextVi = currentVerse + action.dir
      if (nextVi < 0 || nextVi > highestVerse || nextVi >= verses.length) return state
      return { ...state, currentVerse: nextVi, activeWordIdx: 0, errorCount: 0, wrongHebKeys: [] }
    }

    case 'CAROUSEL_NAV': {
      const cur   = state.carouselIdxMap[action.vi] ?? 0
      const total = verses[action.vi].insights.length
      return {
        ...state,
        carouselIdxMap: { ...state.carouselIdxMap, [action.vi]: (cur + action.dir + total) % total },
      }
    }

    default: return state
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GamePanel() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const wordCompleteRef  = useRef(null)
  const newWordRef       = useRef(null)
  const verseCompleteRef = useRef(null)
  const typingSoundsRef  = useRef(null)

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

  // Word complete chime — verse_complete.mp3 takes priority if verse is also done
  useEffect(() => {
    if (state.completedWordSignal > 0 && state.lastCompletedWordId) {
      // If this word also completed the verse, let the verse-complete effect handle audio
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

  // Random typing sound on correct keypress
  useEffect(() => {
    if (state.typingSignal > 0 && typingSoundsRef.current) {
      const sounds = typingSoundsRef.current
      const pick = sounds[Math.floor(Math.random() * sounds.length)]
      pick.currentTime = 0
      pick.play().catch(() => {})
    }
  }, [state.typingSignal])

  // Keyboard handler
  useEffect(() => {
    const handler = e => {
      if (e.key === ' ')               { e.preventDefault(); dispatch({ type: 'SPACE' }) }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); dispatch({ type: 'MOVE_WORD', dir: 1 }) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'MOVE_WORD', dir: -1 }) }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: -1 }) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); dispatch({ type: 'MOVE_VERSE', dir: 1 }) }
      else {
        const heb = LATIN_TO_HEB[e.key.toLowerCase()]
        if (heb) dispatch({ type: 'TYPE', heb })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { currentVerse, activeWordIdx, typedCounts, wordEncounters, errorCount, wrongHebKeys, carouselIdxMap } = state
  const verse      = verses[currentVerse]
  const activeWord = activeWordIdx !== null ? verse.words[activeWordIdx] : null
  const wordId     = activeWord?.id ?? ''
  const typedCount = activeWordIdx !== null ? getTyped(typedCounts, currentVerse, activeWordIdx) : 0
  const wordDone   = activeWordIdx !== null
    ? getTyped(typedCounts, currentVerse, activeWordIdx) >= wordLen(currentVerse, activeWordIdx)
    : false
  const verseDone  = isVerseDone(typedCounts, currentVerse)
  const carouselIdx = carouselIdxMap[currentVerse] ?? 0
  
  // Get word definition data from words.json
  const wordData = wordId ? wordsData.words[wordId] : null
  const encounterCount = wordId ? wordEncounters[wordId] || 0 : 0
  const sbl = activeWord?.sbl || ''

  // Verse completion sound — track which verses have already played it
  const celebratedVersesRef = useRef(new Set())
  useEffect(() => {
    if (verseDone && !celebratedVersesRef.current.has(currentVerse) && verseCompleteRef.current) {
      verseCompleteRef.current.currentTime = 0
      verseCompleteRef.current.play().catch(() => {})
      celebratedVersesRef.current.add(currentVerse)
    }
  }, [verseDone, currentVerse])

  // Always track target letter for idle pulse hint (5s timer in KeyboardGuide)
  const targetLetter = (activeWord && !wordDone) ? wordId[typedCount] : null

  // ESV highlight: the phrase for the currently selected word (even mid-typing)
  const highlightPhrase = activeWord?.esvH ?? null

  return (
    <div className="game-panel">

      <div className="verse-header">
        <span className="verse-ref">Genesis 1:{verse.verse}</span>
        <span className="progress-pill">verse {currentVerse + 1} of {verses.length}</span>
      </div>

      <div className="main-content-grid">
        {/* Left column: Word Definition */}
        <div className="word-definition-column">
          <WordDefinition
            word={wordData}
            wordId={wordId}
            sbl={sbl}
            encounterCount={encounterCount}
            isWordCompleted={wordDone}
          />
        </div>

        {/* Right column: Game content */}
        <div className="game-content-column">
          <div className="verse-scroll-area">
            <VerseScroll
              verses={verses}
              currentVerse={currentVerse}
              activeWordIdx={activeWordIdx}
              typedCounts={typedCounts}
            />
          </div>

          <div className="bottom-strip">
            {verseDone && (
              <InsightCarousel
                key={currentVerse}
                insights={verse.insights}
                idx={carouselIdx}
                onPrev={() => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: -1 })}
                onNext={() => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: 1 })}
                isNewCompletion={!celebratedVersesRef.current.has(currentVerse)}
              />
            )}

            <ESVStrip
              esv={verse.esv}
              highlightPhrase={highlightPhrase}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Guide spans full width below the grid */}
      <KeyboardGuide
        rows={KEYBOARD_ROWS}
        keys={KEYS}
        targetHeb={targetLetter}
        showActiveKey={activeWord && !wordDone && errorCount >= 3}
        wrongHebKeys={wrongHebKeys}
      />

      <div className="footer-note">
        Genesis 1:{verse.verse} — Masoretic Text (BHS) — ESV
      </div>

    </div>
  )
}
