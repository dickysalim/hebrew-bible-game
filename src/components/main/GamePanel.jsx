import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
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
import { useProgressPersistence, loadProgressFromStorage, getChapterProgress } from '../../utils/useProgressPersistence'
import { useChapterLoader, stageIndexFromId } from '../../utils/useChapterLoader'
import { checkRootCompletion } from '../../utils/rootDetection'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { formatProgressFromSupabase } from '../../lib/progress'
import VerseScroll from './sub-components/VerseScroll'
import InsightCarousel from './sub-components/InsightCarousel'
import ESVStrip, { getEsvText } from './sub-components/ESVStrip'
import KeyboardGuide from './sub-components/KeyboardGuide'
import WordDefTabs from './sub-components/WordDefTabs'
import HaberPanel from './sub-components/HaberPanel'

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

// ─── Reducer helpers (take verses as first arg) ──────────────────────────────

const wkey = (vi, wi) => `${vi}-${wi}`
const wordLen = (verses, vi, wi) => verses[vi]?.words[wi]?.id?.length ?? 0
const getTyped = (counts, vi, wi) => counts[wkey(vi, wi)] ?? 0
const isDone = (verses, counts, vi, wi) => getTyped(counts, vi, wi) >= wordLen(verses, vi, wi)
const isVerseDone = (verses, counts, vi) =>
  verses[vi]?.words.every((_, wi) => isDone(verses, counts, vi, wi)) ?? false

// Index of first incomplete word in a verse; -1 if all done
const firstIncomplete = (verses, counts, vi) =>
  verses[vi]?.words.findIndex((_, wi) => !isDone(verses, counts, vi, wi)) ?? -1

// Module-level ref so the reducer can access current verses without prop threading
let versesRef = []

// ─── Game reducer ─────────────────────────────────────────────────────────────

const initialState = {
  stageIndex: 1,          // current chapter's stage_index (1-based)
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
  // Signal that chapter is complete and we need to load the next one
  chapterEndSignal: 0,           // increments when last verse of chapter is completed via SPACE
  // Per-chapter progress map — { [stageIndex]: { typedCounts, wordEncounters, highestVerse, ... } }
  chapters: {},
}

function reducer(state, action) {
  const verses = versesRef
  const { currentVerse, activeWordIdx, typedCounts, highestVerse } = state

  switch (action.type) {

    case 'TYPE': {
      // Auto-select first incomplete word if nothing is active
      let wi = activeWordIdx
      if (wi === null) {
        wi = firstIncomplete(verses, typedCounts, currentVerse)
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
          i === wi ? true : isDone(verses, newCounts, currentVerse, i)
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
      const wLen  = wordLen(verses, currentVerse, activeWordIdx)

      // Partially typed — ignore space
      if (typed > 0 && typed < wLen) return state

      // Unstarted word — deselect
      if (typed === 0) return { ...state, activeWordIdx: null }

      // Done word — jump to first incomplete, or next verse
      const fInc = firstIncomplete(verses, typedCounts, currentVerse)
      if (fInc !== -1) {
        return { ...state, activeWordIdx: fInc, errorCount: 0, wrongHebKeys: [] }
      }
      if (isVerseDone(verses, typedCounts, currentVerse) && currentVerse < verses.length - 1) {
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
      // Last verse of chapter completed — signal chapter-end so component can load next
      if (isVerseDone(verses, typedCounts, currentVerse) && currentVerse >= verses.length - 1) {
        return { ...state, chapterEndSignal: state.chapterEndSignal + 1 }
      }
      return state
    }

    case 'MOVE_WORD': {
      // dir +1 = left arrow (forward in RTL), -1 = right arrow (backward)
      const fInc = firstIncomplete(verses, typedCounts, currentVerse)
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
      const fInc = firstIncomplete(verses, typedCounts, currentVerse)
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
        stageIndex: 1,
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
        chapterEndSignal: 0,
        chapters: {},
      }
    }

    // New chapter's verses have been loaded — save current chapter, restore target
    case 'LOAD_CHAPTER': {
      // Save the current chapter's progress into the chapters map
      const prevSi = state.stageIndex
      const updatedChapters = {
        ...state.chapters,
        [prevSi]: {
          typedCounts: state.typedCounts,
          wordEncounters: state.wordEncounters,
          highestVerse: state.highestVerse,
          currentVerse: state.currentVerse,
          activeWordIdx: state.activeWordIdx,
          carouselIdxMap: state.carouselIdxMap,
          celebratedVerses: state.celebratedVerses,
        },
      }
      // Load saved progress for the target chapter (or defaults)
      const targetSaved = updatedChapters[action.stageIndex]
      return {
        ...state,
        stageIndex: action.stageIndex,
        currentVerse: action.startAtVerse ?? (targetSaved?.currentVerse ?? 0),
        activeWordIdx: targetSaved?.activeWordIdx ?? 0,
        highestVerse: targetSaved?.highestVerse ?? (action.startAtVerse ?? 0),
        typedCounts: targetSaved?.typedCounts ?? {},
        wordEncounters: targetSaved?.wordEncounters ?? state.wordEncounters,
        carouselIdxMap: targetSaved?.carouselIdxMap ?? {},
        celebratedVerses: targetSaved?.celebratedVerses ?? [],
        errorCount: 0,
        wrongHebKeys: [],
        chapterEndSignal: 0,
        chapters: updatedChapters,
      }
    }

    // Jump to a stage from chapter-select — save current, restore target
    case 'JUMP_TO_STAGE': {
      // Save the current chapter's progress into the chapters map
      const prevStage = state.stageIndex
      const chaptersAfterSave = {
        ...state.chapters,
        [prevStage]: {
          typedCounts: state.typedCounts,
          wordEncounters: state.wordEncounters,
          highestVerse: state.highestVerse,
          currentVerse: state.currentVerse,
          activeWordIdx: state.activeWordIdx,
          carouselIdxMap: state.carouselIdxMap,
          celebratedVerses: state.celebratedVerses,
        },
      }
      // Load saved progress for the target chapter (or defaults)
      const targetChSaved = chaptersAfterSave[action.stageIndex]
      return {
        ...state,
        stageIndex: action.stageIndex,
        currentVerse: targetChSaved?.currentVerse ?? 0,
        activeWordIdx: targetChSaved?.activeWordIdx ?? 0,
        highestVerse: targetChSaved?.highestVerse ?? 0,
        typedCounts: targetChSaved?.typedCounts ?? {},
        wordEncounters: targetChSaved?.wordEncounters ?? state.wordEncounters,
        carouselIdxMap: targetChSaved?.carouselIdxMap ?? {},
        celebratedVerses: targetChSaved?.celebratedVerses ?? [],
        errorCount: 0,
        wrongHebKeys: [],
        chapterEndSignal: 0,
        chapters: chaptersAfterSave,
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
// Build reducer initial state from a cached progress snapshot (same shape as
// formatProgressFromSupabase output). Runs synchronously inside useReducer init.
function buildInitialStateFromCache(cp) {
  const discoveredRootsMap = {}
  if (Array.isArray(cp.discoveredRoots)) {
    cp.discoveredRoots.forEach(root => {
      if (root?.id) discoveredRootsMap[root.id] = true
    })
  }
  const si = cp.stageIndex || 1
  // If per-chapter data exists, use it for the current chapter
  const chaptersMap = cp.chapters || {}
  const chapterProgress = chaptersMap[si] || {}
  // Prefer per-chapter data; fall back to flat fields for v1 migration
  return {
    ...initialState,
    stageIndex:      si,
    typedCounts:     chapterProgress.typedCounts     || cp.typedCounts     || {},
    wordEncounters:  chapterProgress.wordEncounters  || cp.wordEncounters  || {},
    highestVerse:    chapterProgress.highestVerse     ?? cp.highestVerse    ?? 0,
    currentVerse:    chapterProgress.currentVerse     ?? cp.currentVerseIndex ?? 0,
    activeWordIdx:   chapterProgress.activeWordIdx    ?? cp.activeWordIdx   ?? 0,
    carouselIdxMap:  chapterProgress.carouselIdxMap   || cp.carouselIdxMap  || {},
    celebratedVerses: chapterProgress.celebratedVerses || cp.celebratedVerses || [],
    discoveredRoots: discoveredRootsMap,
    chapters:        chaptersMap,
    // Restore persisted display settings
    showSBLWord:   cp.settings?.showSBLWord   ?? true,
    showSBLLetter: cp.settings?.showSBLLetter ?? true,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GamePanel({ userId, jumpToStageIndex }) {
  // Use progress persistence hook to save/reset progress
  const { isLoaded, saveProgress, resetProgress } = useProgressPersistence()

  // Progress cache — fetched once after login, survives tab switches
  const { cachedProgress, cacheStatus, updateCache, clearCache } = useProgressCache()

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

  // Determine which stageIndex to start on.
  // jumpToStageIndex takes priority (from chapter-select); otherwise resume saved progress.
  const isJumping = jumpToStageIndex != null
  const resolvedInitialStage = (() => {
    if (isJumping) return jumpToStageIndex
    if (userId && cacheStatus === 'ready' && cachedProgress) {
      return cachedProgress.stageIndex || 1
    }
    if (!userId) {
      const saved = loadProgressFromStorage()
      return saved.stageIndex || 1
    }
    return 1
  })()

  // Dynamic chapter loader — only loads the chapter we need
  const {
    chapterData, chapterMeta, stageIndex: loaderStageIndex,
    isLoading: chapterLoading, hasNext, jumpToStage, advanceToNext
  } = useChapterLoader(resolvedInitialStage)

  // Derive verses from loaded chapter data (empty while loading)
  const verses = chapterData?.verses ?? []
  // Keep module-level ref in sync for the reducer
  versesRef = verses

  const [state, dispatch] = useReducer(reducer, null, () => {
    // Chapter-select jump: restore target chapter from cache if it exists
    if (isJumping) {
      const persistedDiscoveredRoots = loadDiscoveredRootIdsFromStorage()
      // Try to restore per-chapter state for the target chapter
      let chaptersMap = {}
      if (userId && cacheStatus === 'ready' && cachedProgress?.chapters) {
        chaptersMap = cachedProgress.chapters
      } else if (!userId) {
        const savedLocal = loadProgressFromStorage()
        chaptersMap = savedLocal.chapters || {}
      }
      const targetChProgress = chaptersMap[jumpToStageIndex] || {}
      // Restore persisted display settings so chapter-select doesn't reset them
      const jumpSettings = (userId && cacheStatus === 'ready' && cachedProgress?.settings)
        ? cachedProgress.settings
        : {}
      return {
        ...initialState,
        stageIndex: jumpToStageIndex,
        currentVerse: targetChProgress.currentVerse ?? 0,
        activeWordIdx: targetChProgress.activeWordIdx ?? 0,
        highestVerse: targetChProgress.highestVerse ?? 0,
        typedCounts: targetChProgress.typedCounts ?? {},
        wordEncounters: targetChProgress.wordEncounters ?? {},
        carouselIdxMap: targetChProgress.carouselIdxMap ?? {},
        celebratedVerses: targetChProgress.celebratedVerses ?? [],
        discoveredRoots: persistedDiscoveredRoots,
        chapters: chaptersMap,
        showSBLWord:   jumpSettings.showSBLWord   ?? true,
        showSBLLetter: jumpSettings.showSBLLetter ?? true,
      }
    }
    if (userId) {
      if (cacheStatus === 'ready' && cachedProgress) {
        return buildInitialStateFromCache(cachedProgress)
      }
      return { ...initialState, stageIndex: resolvedInitialStage }
    }
    const saved = loadProgressFromStorage()
    const persistedDiscoveredRoots = loadDiscoveredRootIdsFromStorage()
    const chMap = saved.chapters || {}
    const si = saved.stageIndex || 1
    const chProgress = chMap[si] || {}
    return {
      ...initialState,
      stageIndex: si,
      typedCounts: chProgress.typedCounts || {},
      wordEncounters: chProgress.wordEncounters || {},
      highestVerse: chProgress.highestVerse ?? 0,
      currentVerse: chProgress.currentVerse ?? 0,
      activeWordIdx: chProgress.activeWordIdx ?? 0,
      carouselIdxMap: chProgress.carouselIdxMap || {},
      celebratedVerses: chProgress.celebratedVerses || [],
      discoveredRoots: persistedDiscoveredRoots,
      chapters: chMap,
    }
  })

  // Handle jumpToStageIndex prop changes AFTER mount (e.g. if GamePanel stays mounted
  // and user navigates back to menu and picks a different chapter).
  // prevJumpRef starts at null so the mount-time jump is handled by the reducer init above.
  const prevJumpRef = useRef(null)
  useEffect(() => {
    if (jumpToStageIndex != null && jumpToStageIndex !== prevJumpRef.current) {
      // Skip the very first render — that's already handled by reducer init
      if (prevJumpRef.current !== null) {
        jumpToStage(jumpToStageIndex)
        dispatch({ type: 'JUMP_TO_STAGE', stageIndex: jumpToStageIndex })
      }
      prevJumpRef.current = jumpToStageIndex
    }
  }, [jumpToStageIndex, jumpToStage])

  // When chapter data finishes loading (after advance or jump), sync reducer
  const prevLoaderStageRef = useRef(loaderStageIndex)
  useEffect(() => {
    if (!chapterLoading && chapterData && loaderStageIndex !== prevLoaderStageRef.current) {
      prevLoaderStageRef.current = loaderStageIndex
      // Only dispatch LOAD_CHAPTER if reducer hasn't already been set (e.g. by JUMP_TO_STAGE)
      if (state.stageIndex !== loaderStageIndex) {
        dispatch({ type: 'LOAD_CHAPTER', stageIndex: loaderStageIndex })
      }
    }
  }, [chapterLoading, chapterData, loaderStageIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance to next chapter when user presses SPACE on last verse
  useEffect(() => {
    if (state.chapterEndSignal > 0 && hasNext) {
      advanceToNext()
      dispatch({ type: 'LOAD_CHAPTER', stageIndex: loaderStageIndex + 1 })
    }
  }, [state.chapterEndSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // True when the cache has resolved (ready or error) — gates Supabase saves so we
  // don't write an empty state before the initial load completes.
  // cacheStatus === 'ready' covers both "has data" and "new user with no data".
  const readyToSaveRef = useRef(
    !userId || cacheStatus === 'ready'
  )
  const [isTyping, setIsTyping] = useState(false)
  const [haberSessions, setHaberSessions] = useState({})
  const [haberOpen, setHaberOpen] = useState(false)
  const wordCompleteRef  = useRef(null)
  const newWordRef       = useRef(null)
  const verseCompleteRef = useRef(null)
  const typingSoundsRef  = useRef(null)
  const rootFoundRef     = useRef(null)
  // Track which words have already had their "New" badge shown and then navigated away from.
  // This is a ref (not state) so it doesn't trigger re-renders on mutation.
  const shownNewWordIdsRef = useRef(new Set())
  const prevWordIdRef      = useRef(null)

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
      const currentVerseDone = isVerseDone(verses, state.typedCounts, state.currentVerse)
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
    
    // Build the per-chapter map with current chapter included
    const si = state.stageIndex
    const updatedChapters = {
      ...state.chapters,
      [si]: {
        typedCounts: state.typedCounts,
        wordEncounters: state.wordEncounters,
        highestVerse: state.highestVerse,
        currentVerse: state.currentVerse,
        activeWordIdx: state.activeWordIdx,
        carouselIdxMap: state.carouselIdxMap,
        celebratedVerses: state.celebratedVerses,
      },
    }

    saveProgress({
      stageIndex: si,
      chapters: updatedChapters,
    })
  }, [
    isLoaded,
    userId,
    state.stageIndex,
    state.typedCounts,
    state.wordEncounters,
    state.highestVerse,
    state.currentVerse,
    state.activeWordIdx,
    state.carouselIdxMap,
    state.celebratedVerses,
    state.chapters,
    saveProgress
  ])

  // Sync RootDiscoveryContext from cache on mount (lexicon badge needs the root list).
  // The reducer already has the correct state — this only updates the context.
  useEffect(() => {
    if (!userId) return
    // Always mark ready to save once the context has mounted — cacheStatus is
    // already 'ready' here even for brand-new users who have no saved data.
    readyToSaveRef.current = true
    if (!cachedProgress) return
    if (cachedProgress.discoveredRoots) updateDiscoveredRoots(cachedProgress.discoveredRoots)
    if (cachedProgress.discoveredWordsByRoot) updateDiscoveredWordsByRoot(cachedProgress.discoveredWordsByRoot)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress via cache whenever relevant state changes (authenticated users only).
  // ProgressCacheContext debounces the actual Supabase write.
  useEffect(() => {
    if (!userId || !readyToSaveRef.current) return
    updateCache(
      state,
      contextDiscoveredRoots,
      discoveredWordsByRoot,
      { showSBLWord: state.showSBLWord, showSBLLetter: state.showSBLLetter }
    )
  }, [
    userId,
    state.stageIndex,
    state.typedCounts,
    state.wordEncounters,
    state.currentVerse,
    state.highestVerse,
    state.activeWordIdx,
    state.carouselIdxMap,
    state.celebratedVerses,
    state.showSBLWord,
    state.showSBLLetter,
    contextDiscoveredRoots,
    discoveredWordsByRoot,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reset cursor visibility on mouse move
  useEffect(() => {
    const handleMouseMove = () => setIsTyping(false)
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const { currentVerse, activeWordIdx, typedCounts, wordEncounters, errorCount, wrongHebKeys, carouselIdxMap, celebratedVerses } = state

  // Dynamic book/chapter label from loaded chapter metadata
  const bookLabel = chapterMeta?.book ?? 'Genesis'
  const chapterNum = chapterMeta?.chapter ?? 1

  // Guard: while chapter is loading, verses may be empty
  const verse      = verses[currentVerse] ?? null
  const activeWord = (verse && activeWordIdx !== null) ? verse.words[activeWordIdx] : null
  const wordId     = activeWord?.id ?? ''
  const typedCount = activeWordIdx !== null ? getTyped(typedCounts, currentVerse, activeWordIdx) : 0
  const wordDone   = activeWordIdx !== null && verse
    ? getTyped(typedCounts, currentVerse, activeWordIdx) >= wordLen(verses, currentVerse, activeWordIdx)
    : false
  const verseDone  = verse ? isVerseDone(verses, typedCounts, currentVerse) : false
  const carouselIdx = carouselIdxMap[currentVerse] ?? 0

  // Whether this verse's completion has already been celebrated (sound + animation)
  // Stored in reducer state so it survives tab switches without replaying.
  const alreadyCelebrated = celebratedVerses.includes(currentVerse)

  // Get word definition data from words.json
  const wordData = wordId ? wordsData.words[wordId] : null
  const encounterCount = wordId ? wordEncounters[wordId] || 0 : 0
  const sbl = activeWord?.sbl || ''

  // "New" badge — true only on first discovery AND while still on that word.
  // When the user navigates away (wordId changes), the previous word is dismissed
  // so returning to it no longer shows the badge.
  if (wordId !== prevWordIdRef.current) {
    if (prevWordIdRef.current) shownNewWordIdsRef.current.add(prevWordIdRef.current)
    prevWordIdRef.current = wordId
  }
  const isWordNew = wordDone && !!wordId && encounterCount === 1 && !shownNewWordIdsRef.current.has(wordId)

  // Context object passed to Haber for the current word
  const currentWordContext = wordDone && wordData && verse ? {
    id: wordId,
    sbl,
    gloss: wordData.gloss,
    root: wordData.root || '',
    rootSbl: wordData.root_sbl || '',
    verse: verse.verse,
    chapter: chapterNum,
    verseEsv: getEsvText(verse.esv),
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

  // ESV highlight: pass the word index to ESVStrip for positional matching

  // Stable callbacks so InsightCarousel's setInterval doesn't reset on every render
  const handleCarouselPrev = useCallback(
    () => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: -1 }),
    [currentVerse]
  )
  const handleCarouselNext = useCallback(
    () => dispatch({ type: 'CAROUSEL_NAV', vi: currentVerse, dir: 1 }),
    [currentVerse]
  )

  // Show loading screen while chapter data is being fetched
  if (chapterLoading || !verse) {
    return (
      <div className="game-panel">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading {bookLabel} {chapterNum}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`game-panel${isTyping ? ' cursor-none' : ''}`}>

      <div className="verse-header">
        <span className="verse-ref">{bookLabel} {chapterNum}:{verse.verse}</span>
        <span className="progress-pill">verse {currentVerse + 1} of {verses.length}</span>
      </div>

      <div className="main-content-grid">
        {/* Haber sidebar overlay */}
        {haberOpen && currentWordContext && (
          <div className="haber-sidebar">
            <HaberPanel
              currentWordContext={currentWordContext}
              haberSessions={haberSessions}
              setHaberSessions={setHaberSessions}
              onClose={() => setHaberOpen(false)}
            />
          </div>
        )}

        {/* Left column: Word Definition Tabs */}
        <div className="word-definition-column">
          <WordDefTabs
            word={wordData}
            wordId={wordId}
            sbl={sbl}
            encounterCount={encounterCount}
            isWordCompleted={wordDone}
            onOpenHaber={() => setHaberOpen(true)}
            isWordNew={isWordNew}
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
              activeWordIndex={activeWordIdx}
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
              {bookLabel} {chapterNum}:{verse.verse} — Masoretic Text (BHS) — ESV
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
