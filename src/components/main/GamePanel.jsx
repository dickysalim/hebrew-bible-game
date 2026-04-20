import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import versesFile from '../../data/verses/genesis-1.json'
import wordsData from '../../data/words.json'
import rootsData from '../../data/roots.json'
import wordCompleteAudio from '../../assets/audio/word_complete.mp3'
import newWordAudio from '../../assets/audio/new_word.mp3'
import verseCompleteAudio from '../../assets/audio/verse_complete.mp3'
import typingSound1 from '../../assets/audio/typing_sound1.mp3'
import typingSound2 from '../../assets/audio/typing_sound2.mp3'
import typingSound3 from '../../assets/audio/typing_sound3.mp3'
import rootFoundAudio from '../../assets/audio/root_found.mp3'
import { LETTER_SBL, KEYS, KEYBOARD_ROWS, LATIN_TO_HEB } from '../../utils/hebrewData'
import { useProgressPersistence, loadProgressFromStorage } from '../../utils/useProgressPersistence'
import { checkRootCompletion } from '../../utils/rootDetection'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import { loadProgress, saveProgress as saveProgressToSupabase, formatProgressForSupabase, formatProgressFromSupabase } from '../../lib/progress'
import VerseScroll from './sub-components/VerseScroll'
import InsightCarousel from './sub-components/InsightCarousel'
import ESVStrip from './sub-components/ESVStrip'
import KeyboardGuide from './sub-components/KeyboardGuide'
import WordDefinition from './sub-components/WordDefinition'

const LEXICON_STORAGE_KEY = 'hebrew-bible-game-lexicon'

// Load previously discovered root IDs from the lexicon localStorage key
// so the reducer knows not to re-discover them on page refresh.
function loadDiscoveredRootIdsFromStorage() {
  try {
    const saved = localStorage.getItem(LEXICON_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.discoveredRoots)) {
        // Build the { [rootId]: true } map the reducer expects
        return Object.fromEntries(parsed.discoveredRoots.map(r => [r.id, true]))
      }
    }
  } catch (e) {
    // ignore
  }
  return {}
}

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
  // Root detection state
  discoveredRoots: {},           // { [rootId]: true } - tracks all discovered roots
  activeRootFlags: [],           // Array of active flag objects for display
  rootDiscoverySignal: 0,        // increments when root is discovered → triggers audio
  // Verse celebration tracking — persists in reducer so tab switches don't replay
  celebratedVerses: [],          // array of verse indices that have already played the sound
  // SBL display controls
  showSBLWord: true,             // whether to show SBL word transliteration
  showSBLLetter: true,           // whether to show SBL letter transliteration
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
        
        // Check for root completion
        let newDiscoveredRoots = state.discoveredRoots
        let newActiveRootFlags = [...state.activeRootFlags]
        let newRootDiscoverySignal = state.rootDiscoverySignal
        
        const rootDiscovery = checkRootCompletion(wordId, newTyped, state.discoveredRoots)
        if (rootDiscovery) {
          // Mark root as discovered
          newDiscoveredRoots = { ...state.discoveredRoots, [rootDiscovery.rootId]: true }
          
          // Add flag for display
          const flagData = {
            rootId: rootDiscovery.rootId,
            verseIndex: currentVerse,
            wordIndex: wi,
            rootStartIdx: rootDiscovery.rootPosition.start,
            rootEndIdx: rootDiscovery.rootPosition.end,
            timestamp: Date.now(),
          }
          newActiveRootFlags = [...state.activeRootFlags, flagData]
          newRootDiscoverySignal = state.rootDiscoverySignal + 1
        }
        
        return {
          ...state,
          activeWordIdx: wi,
          typedCounts: newCounts,
          wordEncounters: newWordEncounters,
          discoveredRoots: newDiscoveredRoots,
          activeRootFlags: newActiveRootFlags,
          rootDiscoverySignal: newRootDiscoverySignal,
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

    case 'SELECT_WORD': {
      // Select a specific word by index (for mouse clicks)
      const fInc = firstIncomplete(typedCounts, currentVerse)
      const limit = fInc === -1 ? verses[currentVerse].words.length - 1 : fInc
      const targetWi = action.wordIndex

      // Validate: can only select words up to the first incomplete
      if (targetWi < 0 || targetWi > limit) return state

      return { ...state, activeWordIdx: targetWi, errorCount: 0, wrongHebKeys: [] }
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

    case 'FLAG_COMPLETED': {
      // Remove a completed flag from activeRootFlags
      const newActiveRootFlags = state.activeRootFlags.filter(
        (flag, index) => index !== action.flagIndex
      )
      return {
        ...state,
        activeRootFlags: newActiveRootFlags,
      }
    }

    case 'MARK_VERSE_CELEBRATED': {
      // Record that this verse's completion sound + animation has already fired
      if (state.celebratedVerses.includes(action.vi)) return state
      return {
        ...state,
        celebratedVerses: [...state.celebratedVerses, action.vi],
      }
    }

    case 'RESET_PROGRESS': {
      // Reset to initial state but keep audio refs and other non-persistent state
      return {
        ...initialState,
        // Keep the current verse as 0, but reset all progress
        currentVerse: 0,
        activeWordIdx: 0,
        typedCounts: {},
        wordEncounters: {},
        highestVerse: 0,
        errorCount: 0,
        wrongHebKeys: [],
        carouselIdxMap: {},
        completedWordSignal: 0,
        lastCompletedWordId: null,
        typingSignal: 0,
        recentTypedLetter: null,
        celebratedVerses: [],
      }
    }

    case 'TOGGLE_SBL_WORD':
      return { ...state, showSBLWord: !state.showSBLWord }
    
    case 'TOGGLE_SBL_LETTER':
      return { ...state, showSBLLetter: !state.showSBLLetter }

    case 'LOAD_SUPABASE_PROGRESS': {
      const {
        discoveredRoots,
        completedVerses,
        wordEncounters,
        currentVerseIndex,
        typedCounts,
        activeWordIdx,
        highestVerse,
        carouselIdxMap,
        celebratedVerses
      } = action.payload
      
      // Convert discoveredRoots array to object mapping for reducer state
      const discoveredRootsMap = {}
      if (Array.isArray(discoveredRoots)) {
        discoveredRoots.forEach(root => {
          if (root && root.id) {
            discoveredRootsMap[root.id] = true
          }
        })
      }

      // Merge Supabase data with existing state
      // Prefer Supabase data for fields that exist in the payload
      return {
        ...state,
        discoveredRoots: { ...state.discoveredRoots, ...discoveredRootsMap },
        wordEncounters: { ...state.wordEncounters, ...wordEncounters },
        currentVerse: currentVerseIndex !== undefined ? currentVerseIndex : state.currentVerse,
        typedCounts: typedCounts || state.typedCounts,
        activeWordIdx: activeWordIdx !== undefined ? activeWordIdx : state.activeWordIdx,
        highestVerse: highestVerse !== undefined ? highestVerse : state.highestVerse,
        carouselIdxMap: carouselIdxMap || state.carouselIdxMap,
        celebratedVerses: celebratedVerses || state.celebratedVerses,
        // Note: We're merging Supabase data with existing localStorage data
        // This ensures no data loss if user was playing offline
      }
    }

    default: return state
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GamePanel({ userId }) {
  // Use progress persistence hook to save/reset progress
  const { isLoaded, saveProgress, resetProgress } = useProgressPersistence()

  // Root discovery context — used to update the Lexicon tab badge and persist roots
  const {
    addDiscoveredRoot,
    addDiscoveredWordsForRoot,
    updateDiscoveredRoots,
    updateDiscoveredWordsByRoot,
    resetDiscoveredRoots,
    discoveredRoots: contextDiscoveredRoots,
    discoveredWordsByRoot
  } = useRootDiscovery()

  const [state, dispatch] = useReducer(reducer, null, () => {
    if (userId) return initialState  // authenticated: start clean, load from Supabase
    const saved = loadProgressFromStorage()
    const persistedDiscoveredRoots = loadDiscoveredRootIdsFromStorage()
    return { ...initialState, ...saved, discoveredRoots: persistedDiscoveredRoots }
  })
  const [hasLoadedSupabaseProgress, setHasLoadedSupabaseProgress] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [haberSessions, setHaberSessions] = useState({})
  const wordCompleteRef  = useRef(null)
  const newWordRef       = useRef(null)
  const verseCompleteRef = useRef(null)
  const typingSoundsRef  = useRef(null)
  const rootFoundRef     = useRef(null)

  useEffect(() => {
    wordCompleteRef.current = new Audio(wordCompleteAudio)
    newWordRef.current = new Audio(newWordAudio)
    verseCompleteRef.current = new Audio(verseCompleteAudio)
    rootFoundRef.current = new Audio(rootFoundAudio)
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
      const currentVerseDone = isVerseDone(state.typedCounts, state.currentVerse)
      if (currentVerseDone) return

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

  // Root found audio
  useEffect(() => {
    if (state.rootDiscoverySignal > 0 && rootFoundRef.current) {
      rootFoundRef.current.currentTime = 0
      rootFoundRef.current.play().catch(() => {})
    }
  }, [state.rootDiscoverySignal])

  // Sync newly discovered roots to RootDiscoveryContext for the Lexicon tab badge
  // We watch activeRootFlags — each new flag entry means a root was just discovered
  useEffect(() => {
    if (state.activeRootFlags.length === 0) return
    const latestFlag = state.activeRootFlags[state.activeRootFlags.length - 1]
    const rootId = latestFlag.rootId
    const rootData = rootsData.roots[rootId]
    if (rootData) {
      addDiscoveredRoot({ id: rootId, ...rootData })
    }
  }, [state.rootDiscoverySignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track words discovered per root — fires when a new word is completed for the first time
  useEffect(() => {
    const wordId = state.lastCompletedWordId
    if (!wordId) return
    const encounterCount = state.wordEncounters[wordId] || 0
    // Only track the first encounter
    if (encounterCount !== 1) return
    const wordData = wordsData.words[wordId]
    if (!wordData?.root) return
    addDiscoveredWordsForRoot(wordData.root, [{ word: wordId }])
  }, [state.completedWordSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress to localStorage when relevant state changes
  // Skip localStorage saving for authenticated users (userId exists)
  useEffect(() => {
    if (!isLoaded || userId) return // Don't save before loading is complete or if user is authenticated
    
    // Only save the persistent parts of state
    const progressToSave = {
      typedCounts: state.typedCounts,
      wordEncounters: state.wordEncounters,
      highestVerse: state.highestVerse,
      currentVerse: state.currentVerse,
      activeWordIdx: state.activeWordIdx,
      carouselIdxMap: state.carouselIdxMap,
      celebratedVerses: state.celebratedVerses,
    }

    saveProgress(progressToSave)
  }, [
    isLoaded,
    userId,
    state.typedCounts,
    state.wordEncounters,
    state.highestVerse,
    state.currentVerse,
    state.activeWordIdx,
    state.carouselIdxMap,
    state.celebratedVerses,
    saveProgress
  ])

  // Load progress from Supabase when userId is available
  useEffect(() => {
    if (!userId || hasLoadedSupabaseProgress) return

    const loadFromSupabase = async () => {
      try {
        const supabaseProgress = await loadProgress(userId)
        if (supabaseProgress) {
          const formattedProgress = formatProgressFromSupabase(supabaseProgress)
          
          // Dispatch action to update game state with Supabase progress
          dispatch({
            type: 'LOAD_SUPABASE_PROGRESS',
            payload: formattedProgress
          })

          // Update RootDiscoveryContext with Supabase data
          if (formattedProgress.discoveredRoots) {
            updateDiscoveredRoots(formattedProgress.discoveredRoots)
          }
          if (formattedProgress.discoveredWordsByRoot) {
            updateDiscoveredWordsByRoot(formattedProgress.discoveredWordsByRoot)
          }

          console.log('Loaded progress from Supabase for user:', userId)
        } else {
          // No Supabase data - check if we have localStorage data to migrate
          // The context already has localStorage data loaded on initialization
          // We'll let the save progress effect handle saving it to Supabase
          console.log('No Supabase data found for user, will use localStorage data:', userId)
        }
        setHasLoadedSupabaseProgress(true)
      } catch (error) {
        console.error('Failed to load progress from Supabase:', error)
        setHasLoadedSupabaseProgress(true) // Don't retry on error
      }
    }

    loadFromSupabase()
  }, [userId, hasLoadedSupabaseProgress, dispatch])

  // Save progress to Supabase when relevant state changes and userId is available
  useEffect(() => {
    if (!userId || !hasLoadedSupabaseProgress) return

    // Format progress for Supabase
    const progressForSupabase = formatProgressForSupabase(state, contextDiscoveredRoots, discoveredWordsByRoot)
    
    // Save to Supabase
    const saveToSupabase = async () => {
      try {
        await saveProgressToSupabase(userId, progressForSupabase)
      } catch (error) {
        console.error('Failed to save progress to Supabase:', error)
        // Continue with localStorage as fallback
      }
    }

    saveToSupabase()
  }, [
    userId,
    hasLoadedSupabaseProgress,
    state.typedCounts,
    state.wordEncounters,
    state.currentVerse,
    contextDiscoveredRoots,
    discoveredWordsByRoot
  ])

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
      // Don't intercept keypresses in text inputs (e.g. Haber conversation)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Debug reset: Ctrl+Shift+R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        if (window.confirm('Reset all progress? This will clear all saved typing progress.')) {
          resetProgress()
          resetDiscoveredRoots()
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

  // Reset cursor visibility on mouse move
  useEffect(() => {
    const handleMouseMove = () => setIsTyping(false)
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const { currentVerse, activeWordIdx, typedCounts, wordEncounters, errorCount, wrongHebKeys, carouselIdxMap, celebratedVerses } = state
  const verse      = verses[currentVerse]
  const activeWord = activeWordIdx !== null ? verse.words[activeWordIdx] : null
  const wordId     = activeWord?.id ?? ''
  const typedCount = activeWordIdx !== null ? getTyped(typedCounts, currentVerse, activeWordIdx) : 0
  const wordDone   = activeWordIdx !== null
    ? getTyped(typedCounts, currentVerse, activeWordIdx) >= wordLen(currentVerse, activeWordIdx)
    : false
  const verseDone  = isVerseDone(typedCounts, currentVerse)
  const carouselIdx = carouselIdxMap[currentVerse] ?? 0

  // Whether this verse's completion has already been celebrated (sound + animation)
  // Stored in reducer state so it survives tab switches without replaying.
  const alreadyCelebrated = celebratedVerses.includes(currentVerse)

  // Get word definition data from words.json
  const wordData = wordId ? wordsData.words[wordId] : null
  const encounterCount = wordId ? wordEncounters[wordId] || 0 : 0
  const sbl = activeWord?.sbl || ''

  // Context object passed to Haber for the current word
  const currentWordContext = wordDone && wordData ? {
    id: wordId,
    sbl,
    gloss: wordData.gloss,
    root: wordData.root || '',
    rootSbl: wordData.root_sbl || '',
    verse: verse.verse,
    chapter: 1,
    verseEsv: verse.esv,
  } : null

  // Verse completion sound — only fires once per verse per session
  useEffect(() => {
    if (verseDone && !alreadyCelebrated && verseCompleteRef.current) {
      verseCompleteRef.current.currentTime = 0
      verseCompleteRef.current.play().catch(() => {})
      dispatch({ type: 'MARK_VERSE_CELEBRATED', vi: currentVerse })
    }
  }, [verseDone, currentVerse]) // eslint-disable-line react-hooks/exhaustive-deps

  // Always track target letter for idle pulse hint (5s timer in KeyboardGuide)
  const targetLetter = (activeWord && !wordDone) ? wordId[typedCount] : null

  // ESV highlight: the phrase for the currently selected word (even mid-typing)
  const highlightPhrase = activeWord?.esvH ?? null

  // Stable callbacks so InsightCarousel's setInterval doesn't reset on every render
  const handleCarouselPrev = useCallback(
    () => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: -1 }),
    [currentVerse]
  )
  const handleCarouselNext = useCallback(
    () => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: 1 }),
    [currentVerse]
  )

  return (
    <div className={`game-panel${isTyping ? ' cursor-none' : ''}`}>

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
            currentWordContext={currentWordContext}
            haberSessions={haberSessions}
            setHaberSessions={setHaberSessions}
          />
        </div>

        {/* Right column: Game content + keyboard */}
        <div className="game-content-column">
          <div className="verse-scroll-area">
            <VerseScroll
              verses={verses}
              currentVerse={currentVerse}
              activeWordIdx={activeWordIdx}
              typedCounts={typedCounts}
              activeRootFlags={state.activeRootFlags}
              dispatch={dispatch}
              showSBLWord={state.showSBLWord}
              showSBLLetter={state.showSBLLetter}
            />
          </div>

          <div className="bottom-strip">
            {verseDone && (
              <InsightCarousel
                key={currentVerse}
                insights={verse.insights}
                idx={carouselIdx}
                onPrev={handleCarouselPrev}
                onNext={handleCarouselNext}
                isNewCompletion={!alreadyCelebrated}
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
              showActiveKey={activeWord && !wordDone && errorCount >= 3}
              wrongHebKeys={wrongHebKeys}
              showSBLWord={state.showSBLWord}
              showSBLLetter={state.showSBLLetter}
              onToggleSBLWord={() => dispatch({ type: 'TOGGLE_SBL_WORD' })}
              onToggleSBLLetter={() => dispatch({ type: 'TOGGLE_SBL_LETTER' })}
            />

            <div className="footer-note">
              Genesis 1:{verse.verse} — Masoretic Text (BHS) — ESV
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
