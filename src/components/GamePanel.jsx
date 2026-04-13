import { useReducer, useEffect, useRef } from 'react'
import versesFile from '../data/verses/genesis-1.json'
import wordCompleteAudio from '../assets/audio/word_complete.mp3'
import typingSound1 from '../assets/audio/typing_sound1.mp3'
import typingSound2 from '../assets/audio/typing_sound2.mp3'
import typingSound3 from '../assets/audio/typing_sound3.mp3'
import { LETTER_SBL, KEYS, KEYBOARD_ROWS, LATIN_TO_HEB, getLetterTypes } from '../utils/hebrewData'
import VerseScroll from './VerseScroll'
import InsightCarousel from './InsightCarousel'
import ESVStrip from './ESVStrip'
import KeyboardGuide from './KeyboardGuide'

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
  highestVerse: 0,
  errorCount: 0,
  wrongHebKeys: [],
  carouselIdxMap: {},
  completedWordSignal: 0, // increments → triggers word_complete audio
  typingSignal: 0,        // increments on correct keypress → triggers typing sound
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
        return {
          ...state,
          activeWordIdx: wi,
          typedCounts: newCounts,
          errorCount: 0,
          wrongHebKeys: [],
          highestVerse: verseDone ? Math.max(highestVerse, currentVerse + 1) : highestVerse,
          completedWordSignal: wordDone ? state.completedWordSignal + 1 : state.completedWordSignal,
          typingSignal: state.typingSignal + 1,
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
  const typingSoundsRef  = useRef(null)

  useEffect(() => {
    wordCompleteRef.current = new Audio(wordCompleteAudio)
    typingSoundsRef.current = [
      new Audio(typingSound1),
      new Audio(typingSound2),
      new Audio(typingSound3),
    ]
  }, [])

  // Word complete chime
  useEffect(() => {
    if (state.completedWordSignal > 0 && wordCompleteRef.current) {
      wordCompleteRef.current.currentTime = 0
      wordCompleteRef.current.play().catch(() => {})
    }
  }, [state.completedWordSignal])

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

  const { currentVerse, activeWordIdx, typedCounts, errorCount, wrongHebKeys, carouselIdxMap } = state
  const verse      = verses[currentVerse]
  const activeWord = activeWordIdx !== null ? verse.words[activeWordIdx] : null
  const wordId     = activeWord?.id ?? ''
  const typedCount = activeWordIdx !== null ? getTyped(typedCounts, currentVerse, activeWordIdx) : 0
  const wordDone   = activeWordIdx !== null
    ? getTyped(typedCounts, currentVerse, activeWordIdx) >= wordLen(currentVerse, activeWordIdx)
    : false
  const verseDone  = isVerseDone(typedCounts, currentVerse)
  const carouselIdx = carouselIdxMap[currentVerse] ?? 0

  // Show target key hint after 3+ errors (only if a word is active and not done)
  const targetLetter = (activeWord && !wordDone && errorCount >= 3)
    ? wordId[typedCount]
    : null

  // ESV highlight: the phrase for the currently selected word (even mid-typing)
  const highlightPhrase = activeWord?.esvH ?? null

  return (
    <div className="game-panel">

      <div className="verse-header">
        <span className="verse-ref">Genesis 1:{verse.verse}</span>
        <span className="progress-pill">verse {currentVerse + 1} of {verses.length}</span>
      </div>

      <VerseScroll
        verses={verses}
        currentVerse={currentVerse}
        activeWordIdx={activeWordIdx}
        typedCounts={typedCounts}
      />

      {verseDone && (
        <InsightCarousel
          insights={verse.insights}
          idx={carouselIdx}
          onPrev={() => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: -1 })}
          onNext={() => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: 1 })}
        />
      )}

      <ESVStrip
        esv={verse.esv}
        highlightPhrase={highlightPhrase}
      />

      <KeyboardGuide
        rows={KEYBOARD_ROWS}
        keys={KEYS}
        targetHeb={targetLetter}
        wrongHebKeys={wrongHebKeys}
      />

      <div className="footer-note">
        Genesis 1:{verse.verse} — Masoretic Text (BHS) — ESV
      </div>

    </div>
  )
}
