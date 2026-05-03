import { checkRootCompletion } from '../../utils/rootDetection'

// ─── Reducer helpers (take verses as first arg) ──────────────────────────────

export const wkey = (vi, wi) => `${vi}-${wi}`
export const wordLen = (verses, vi, wi) => verses[vi]?.words[wi]?.id?.length ?? 0
export const getTyped = (counts, vi, wi) => counts[wkey(vi, wi)] ?? 0
export const isDone = (verses, counts, vi, wi) => getTyped(counts, vi, wi) >= wordLen(verses, vi, wi)
export const isVerseDone = (verses, counts, vi) =>
  verses[vi]?.words.every((_, wi) => isDone(verses, counts, vi, wi)) ?? false

// Index of first incomplete word in a verse; -1 if all done
export const firstIncomplete = (verses, counts, vi) =>
  verses[vi]?.words.findIndex((_, wi) => !isDone(verses, counts, vi, wi)) ?? -1

// Module-level ref so the reducer can access current verses without prop threading
let versesRef = []
export const setVersesRef = (v) => { versesRef = v }

// ─── Initial state ─────────────────────────────────────────────────────────────

export const initialState = {
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
  discoveredRoots: {},
  activeRootFlags: [],
  rootDiscoverySignal: 0,
  celebratedVerses: [],
  showSBLWord: true,
  showSBLLetter: true,
  expertMode: false,
  chapterEndSignal: 0,
  prevChapterSignal: 0,
  chapters: {},
}

// ─── Game reducer ─────────────────────────────────────────────────────────────

export function reducer(state, action) {
  const verses = versesRef
  const { currentVerse, activeWordIdx, typedCounts, highestVerse } = state

  switch (action.type) {

    case 'TYPE': {
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
        let newWordEncounters = state.wordEncounters
        if (wordDone) {
          const currentCount = state.wordEncounters[wordId] || 0
          newWordEncounters = { ...state.wordEncounters, [wordId]: currentCount + 1 }
        }

        let newDiscoveredRoots = state.discoveredRoots
        let newActiveRootFlags = [...state.activeRootFlags]
        let newRootDiscoverySignal = state.rootDiscoverySignal

        const rootDiscovery = checkRootCompletion(wordId, newTyped, state.discoveredRoots)
        if (rootDiscovery) {
          newDiscoveredRoots = { ...state.discoveredRoots, [rootDiscovery.rootId]: true }
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
          recentTypedLetter: action.heb,
        }
      }

      const newWrong = state.wrongHebKeys.includes(action.heb)
        ? state.wrongHebKeys
        : [...state.wrongHebKeys, action.heb]
      return { ...state, activeWordIdx: wi, errorCount: state.errorCount + 1, wrongHebKeys: newWrong }
    }

    case 'SPACE': {
      if (activeWordIdx === null) return state

      const typed = getTyped(typedCounts, currentVerse, activeWordIdx)
      const wLen  = wordLen(verses, currentVerse, activeWordIdx)

      if (typed > 0 && typed < wLen) return state
      if (typed === 0) return { ...state, activeWordIdx: null }

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
      if (isVerseDone(verses, typedCounts, currentVerse) && currentVerse >= verses.length - 1) {
        return { ...state, chapterEndSignal: state.chapterEndSignal + 1 }
      }
      return state
    }

    case 'MOVE_WORD': {
      const fInc = firstIncomplete(verses, typedCounts, currentVerse)
      const limit = fInc === -1 ? verses[currentVerse].words.length - 1 : fInc

      if (activeWordIdx === null) {
        return fInc === -1 ? state : { ...state, activeWordIdx: fInc }
      }

      const nextWi = activeWordIdx + action.dir
      if (action.dir === 1  && nextWi > limit) return state
      if (action.dir === -1 && nextWi < 0)     return state
      return { ...state, activeWordIdx: nextWi, errorCount: 0, wrongHebKeys: [] }
    }

    case 'SELECT_WORD': {
      const fInc = firstIncomplete(verses, typedCounts, currentVerse)
      const limit = fInc === -1 ? verses[currentVerse].words.length - 1 : fInc
      const targetWi = action.wordIndex

      if (targetWi < 0 || targetWi > limit) return state
      return { ...state, activeWordIdx: targetWi, errorCount: 0, wrongHebKeys: [] }
    }

    case 'MOVE_VERSE': {
      const nextVi = currentVerse + action.dir
      // Going backward past the first verse: signal the previous chapter
      if (action.dir === -1 && currentVerse === 0) {
        return { ...state, prevChapterSignal: state.prevChapterSignal + 1 }
      }
      // Going forward past the last verse: signal the next chapter,
      // but only if this verse has been completed or already surpassed
      if (action.dir === 1 && nextVi >= verses.length) {
        const verseCompleted = isVerseDone(verses, typedCounts, currentVerse) || currentVerse < highestVerse
        if (verseCompleted) return { ...state, chapterEndSignal: state.chapterEndSignal + 1 }
        return state
      }
      if (nextVi < 0 || nextVi > highestVerse) return state
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
      const newActiveRootFlags = state.activeRootFlags.filter(
        (flag, index) => index !== action.flagIndex
      )
      return { ...state, activeRootFlags: newActiveRootFlags }
    }

    case 'MARK_VERSE_CELEBRATED': {
      if (state.celebratedVerses.includes(action.vi)) return state
      return { ...state, celebratedVerses: [...state.celebratedVerses, action.vi] }
    }

    case 'RESET_PROGRESS': {
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
        prevChapterSignal: 0,
        chapters: {},
      }
    }

    case 'LOAD_CHAPTER': {
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
        prevChapterSignal: 0,
        chapters: updatedChapters,
      }
    }

    case 'JUMP_TO_STAGE': {
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

    case 'TOGGLE_EXPERT_MODE':
      return { ...state, expertMode: !state.expertMode }

    case 'RESET_VERSE': {
      // Clear all typedCounts for the current verse, reset cursor to word 0
      const clearedCounts = { ...typedCounts }
      const vWords = verses[currentVerse]?.words || []
      for (let wi = 0; wi < vWords.length; wi++) {
        delete clearedCounts[wkey(currentVerse, wi)]
      }
      return {
        ...state,
        typedCounts: clearedCounts,
        activeWordIdx: 0,
        errorCount: 0,
        wrongHebKeys: [],
      }
    }

    // Full state restore from Supabase — dispatched once after async load completes.
    // Uses buildInitialStateFromCache so the restore logic stays in one place.
    case 'INIT_FROM_SUPABASE': {
      return buildInitialStateFromCache(action.payload)
    }

    case 'LOAD_SUPABASE_PROGRESS': {
      const {
        discoveredRoots,
        wordEncounters,
        currentVerseIndex,
        typedCounts,
        activeWordIdx,
        highestVerse,
        carouselIdxMap,
        celebratedVerses,
      } = action.payload

      const discoveredRootsMap = {}
      if (Array.isArray(discoveredRoots)) {
        discoveredRoots.forEach(root => {
          if (root?.id) discoveredRootsMap[root.id] = true
        })
      }

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
      }
    }

    default: return state
  }
}

// Build reducer initial state from a cached progress snapshot.
// Runs synchronously inside useReducer init.
export function buildInitialStateFromCache(cp) {
  const discoveredRootsMap = {}
  if (Array.isArray(cp.discoveredRoots)) {
    cp.discoveredRoots.forEach(root => {
      if (root?.id) discoveredRootsMap[root.id] = true
    })
  }
  const si = cp.stageIndex || 1
  const chaptersMap = cp.chapters || {}
  const chapterProgress = chaptersMap[si] || {}
  return {
    ...initialState,
    stageIndex:       si,
    typedCounts:      chapterProgress.typedCounts     || cp.typedCounts     || {},
    wordEncounters:   chapterProgress.wordEncounters  || cp.wordEncounters  || {},
    highestVerse:     chapterProgress.highestVerse     ?? cp.highestVerse    ?? 0,
    currentVerse:     chapterProgress.currentVerse     ?? cp.currentVerseIndex ?? 0,
    activeWordIdx:    chapterProgress.activeWordIdx    ?? cp.activeWordIdx   ?? 0,
    carouselIdxMap:   chapterProgress.carouselIdxMap   || cp.carouselIdxMap  || {},
    celebratedVerses: chapterProgress.celebratedVerses || cp.celebratedVerses || [],
    discoveredRoots:  discoveredRootsMap,
    chapters:         chaptersMap,
    showSBLWord:      cp.settings?.showSBLWord   ?? true,
    showSBLLetter:    cp.settings?.showSBLLetter ?? true,
    expertMode:       cp.settings?.expertMode    ?? false,
  }
}
