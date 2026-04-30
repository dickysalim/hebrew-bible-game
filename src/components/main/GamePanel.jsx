import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import wordsData from '../../data/words.json'
import rootsData from '../../data/roots.json'
import { LETTER_SBL, KEYS, KEYBOARD_ROWS, LATIN_TO_HEB } from '../../utils/hebrewData'
import { useGameKeyboard } from '../../hooks/useGameKeyboard'
import { useAudioEffects } from '../../hooks/useAudioEffects'
import { useSyncProgress } from '../../hooks/useSyncProgress'
import { useProgressPersistence, loadProgressFromStorage, getChapterProgress } from '../../utils/useProgressPersistence'
import { useChapterLoader, stageIndexFromId } from '../../utils/useChapterLoader'
import { reducer, initialState, setVersesRef, isVerseDone, getTyped, wordLen, buildInitialStateFromCache } from './gameReducer'
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
  setVersesRef(verses)

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

  const [isTyping, setIsTyping] = useState(false)
  const [haberSessions, setHaberSessions] = useState({})
  const [haberOpen, setHaberOpen] = useState(false)
  // Track which words have already had their "New" badge shown and then navigated away from.
  // This is a ref (not state) so it doesn't trigger re-renders on mutation.
  const shownNewWordIdsRef = useRef(new Set())
  const prevWordIdRef      = useRef(null)


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

  useSyncProgress({
    userId, isLoaded, cacheStatus, state, cachedProgress,
    contextDiscoveredRoots, discoveredWordsByRoot,
    saveProgress, updateCache, updateDiscoveredRoots, updateDiscoveredWordsByRoot,
  })

  // Restore Supabase progress into the reducer once the async load completes.
  // The useReducer initializer runs synchronously at mount, before Supabase responds,
  // so cacheStatus is never 'ready' at that point — we must dispatch here instead.
  const hasRestoredFromSupabase = useRef(false)
  useEffect(() => {
    if (!userId || cacheStatus !== 'ready' || hasRestoredFromSupabase.current) return
    hasRestoredFromSupabase.current = true
    if (!cachedProgress) return
    dispatch({ type: 'INIT_FROM_SUPABASE', payload: cachedProgress })
    const targetStage = cachedProgress.stageIndex || 1
    if (targetStage !== loaderStageIndex) {
      jumpToStage(targetStage)
    }
  }, [cacheStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler
  useGameKeyboard(dispatch, resetProgress, resetDiscoveredRoots, clearCache, setIsTyping)

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

  useAudioEffects(state, verseDone, alreadyCelebrated, currentVerse, dispatch)

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
