import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWord } from '../../lib/lexiconCache'
import { LETTER_SBL, KEYS, KEYBOARD_ROWS, LATIN_TO_HEB } from '../../utils/hebrewData'
import { useGameKeyboard } from '../../hooks/useGameKeyboard'
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard'
import { useAudioEffects } from '../../hooks/useAudioEffects'
import { useSyncProgress } from '../../hooks/useSyncProgress'
import { useProgressPersistence, loadProgressFromStorage } from '../../utils/useProgressPersistence'
import { useChapterLoader, CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { reducer, initialState, findWord, findVerseIndex, isVerseDone } from './gameReducer'
import { useRootDiscovery } from '../../contexts/RootDiscoveryContext'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { useLemmaCache } from '../../hooks/useLemmaCache'
import VerseScroll from './sub-components/VerseScroll'
import TAHOTStrip, { getGlossText } from './sub-components/TAHOTStrip'
import KeyboardGuide from './sub-components/KeyboardGuide'
import WordDefTabs from './sub-components/WordDefTabs'
import HaberPanel from './sub-components/HaberPanel'
import MobileHebrewKeyboard from './sub-components/MobileHebrewKeyboard'
import WordDefSheet from './sub-components/WordDefSheet'

function LoadingEscapeButton() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <button
      className="loading-escape-btn"
      onClick={() => navigate('/')}
      style={{
        marginTop: '1.5rem',
        padding: '0.5rem 1.25rem',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '0.5rem',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        letterSpacing: '0.03em',
      }}
    >
      ← Back to Menu
    </button>
  )
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function GamePanel({ userId, jumpToStageIndex }) {
  const { isLoaded, saveProgress, resetProgress } = useProgressPersistence()

  const { cachedProgress, cacheStatus, updateCache, clearCache } = useProgressCache()

  const {
    addDiscoveredWordsForRoot,
    updateDiscoveredRoots,
    updateDiscoveredWordsByRoot,
    resetDiscoveredRoots,
    discoveredRoots: contextDiscoveredRoots,
    discoveredWordsByRoot
  } = useRootDiscovery()

  const isJumping = jumpToStageIndex != null
  const resolvedInitialStage = (() => {
    if (isJumping) return jumpToStageIndex
    if (userId && cacheStatus === 'ready' && cachedProgress) {
      return cachedProgress.currentStageIndex || 1
    }
    if (!userId) {
      const saved = loadProgressFromStorage()
      return saved.currentStageIndex || saved.stageIndex || 1
    }
    return 1
  })()

  const {
    chapterData, chapterMeta, stageIndex: loaderStageIndex,
    isLoading: chapterLoading, loadId, hasNext, hasPrev, jumpToStage, advanceToNext, goToPrev
  } = useChapterLoader(resolvedInitialStage)

  const verses = chapterData?.verses ?? []

  const [lemmaMap, refreshLemmaCache] = useLemmaCache()

  const [state, dispatch] = useReducer(reducer, null, () => {
    let cached = { highestWordOrder: 0, currentStageIndex: 1, currentWordOrder: 1, typedChars: 0 }
    if (userId && cacheStatus === 'ready' && cachedProgress) {
      cached = {
        highestWordOrder: cachedProgress.highestWordOrder ?? 0,
        currentStageIndex: cachedProgress.currentStageIndex ?? 1,
        currentWordOrder: cachedProgress.currentWordOrder ?? 1,
        typedChars: cachedProgress.typedChars ?? 0,
      }
    } else if (!userId) {
      const saved = loadProgressFromStorage()
      cached = {
        highestWordOrder: saved.highestWordOrder ?? 0,
        currentStageIndex: saved.currentStageIndex ?? 1,
        currentWordOrder: saved.currentWordOrder ?? 1,
        typedChars: saved.typedChars ?? 0,
      }
    }
    if (isJumping) {
      const entry = CHAPTER_REGISTRY.find(e => e.stageIndex === jumpToStageIndex)
      cached.currentStageIndex = jumpToStageIndex
      cached.currentWordOrder = entry?.firstWordOrder ?? 1
      if (cached.highestWordOrder >= (entry?.firstWordOrder ?? 1)) {
        cached.currentWordOrder = cached.highestWordOrder + 1
      }
    }
    const settings = (userId && cacheStatus === 'ready' && cachedProgress?.settings) ? cachedProgress.settings : {}
    return {
      ...initialState,
      ...cached,
      showSBLWord: settings.showSBLWord ?? true,
      showSBLLetter: settings.showSBLLetter ?? true,
      showGloss: settings.showGloss ?? true,
      showTAHOT: settings.showTAHOT ?? true,
      showNikud: settings.showNikud ?? false,
      expertMode: settings.expertMode ?? false,
    }
  })

  const versesDispatch = useCallback((action) => {
    if (['TYPE', 'SPACE', 'MOVE_VERSE', 'MOVE_WORD', 'SELECT_WORD'].includes(action.type)) {
      dispatch({ ...action, verses })
    } else {
      dispatch(action)
    }
  }, [verses])

  const prevJumpRef = useRef(null)
  useEffect(() => {
    if (jumpToStageIndex != null && jumpToStageIndex !== prevJumpRef.current) {
      jumpToStage(jumpToStageIndex)
      const entry = CHAPTER_REGISTRY.find(e => e.stageIndex === jumpToStageIndex)
      dispatch({ type: 'JUMP_TO_STAGE', targetStageIndex: jumpToStageIndex, targetFirstWordOrder: entry?.firstWordOrder ?? 1, targetLastWordOrder: entry?.lastWordOrder })
      prevJumpRef.current = jumpToStageIndex
    }
  }, [jumpToStageIndex, jumpToStage])

  // ─── Chapter navigation (robust, loadId-based + smooth transition) ──────
  const landAtEndRef = useRef(false)
  const [chapterTransition, setChapterTransition] = useState('idle')
  const pendingNavRef = useRef(null)

  useEffect(() => {
    if (chapterTransition !== 'fading-out') return
    const timer = setTimeout(() => {
      if (pendingNavRef.current) {
        pendingNavRef.current()
        pendingNavRef.current = null
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [chapterTransition])

  useEffect(() => {
    if (!chapterData || chapterLoading) return
    const meta = CHAPTER_REGISTRY.find(e => e.stageIndex === loaderStageIndex)
    const landAtEnd = landAtEndRef.current
    landAtEndRef.current = false
    dispatch({
      type: 'LOAD_CHAPTER',
      targetStageIndex: loaderStageIndex,
      targetFirstWordOrder: meta?.firstWordOrder ?? 1,
      targetLastWordOrder: meta?.lastWordOrder,
      landAtEnd,
    })
    refreshLemmaCache(chapterData)
    setChapterTransition('fading-in')
    const timer = setTimeout(() => setChapterTransition('idle'), 350)
    return () => clearTimeout(timer)
  }, [loadId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.chapterEndSignal > 0 && hasNext && chapterTransition === 'idle') {
      setChapterTransition('fading-out')
      pendingNavRef.current = () => advanceToNext()
    }
  }, [state.chapterEndSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.prevChapterSignal === 0 || !hasPrev || chapterTransition !== 'idle') return
    const prevSi = loaderStageIndex - 1
    const prevEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === prevSi)
    if (!prevEntry || state.highestWordOrder < prevEntry.firstWordOrder) return
    setChapterTransition('fading-out')
    landAtEndRef.current = true
    pendingNavRef.current = () => goToPrev()
  }, [state.prevChapterSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  const [isTyping, setIsTyping] = useState(false)
  const [haberSessions, setHaberSessions] = useState({})
  const [haberOpen, setHaberOpen] = useState(false)
  const [wordDefSheetOpen, setWordDefSheetOpen] = useState(false)

  const MOB_FONT_KEY = 'hbg-mob-font-size'
  const [mobFontSize, setMobFontSize] = useState(() => {
    const saved = parseInt(localStorage.getItem(MOB_FONT_KEY), 10)
    return (saved >= 18 && saved <= 28) ? saved : 18
  })
  const incMobFont = () => setMobFontSize(s => { const v = Math.min(28, s + 2); localStorage.setItem(MOB_FONT_KEY, v); return v })
  const decMobFont = () => setMobFontSize(s => { const v = Math.max(18, s - 2); localStorage.setItem(MOB_FONT_KEY, v); return v })
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const MOBILE_MQ = '(max-width: 640px), (max-width: 1024px) and (orientation: portrait)'
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_MQ).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [mobileBottomH, setMobileBottomH] = useState(0)
  const mobileObsRef = useRef(null)
  const mobileBottomRef = useCallback((node) => {
    if (mobileObsRef.current) {
      mobileObsRef.current.disconnect()
      mobileObsRef.current = null
    }
    if (node) {
      const obs = new ResizeObserver(([entry]) => setMobileBottomH(entry.contentRect.height))
      obs.observe(node)
      mobileObsRef.current = obs
    } else {
      setMobileBottomH(0)
    }
  }, [])
  const shownNewWordIdsRef = useRef(new Set())
  const prevWordIdRef      = useRef(null)

  useEffect(() => {
    const wordId = state.lastCompletedWordId
    if (!wordId) return
    const encounterCount = state.wordEncounters[wordId] || 0
    if (encounterCount !== 1) return
    const wordData = getWord(wordId)
    if (!wordData?.root) return
    addDiscoveredWordsForRoot(wordData.root, [{ word: wordId }])
  }, [state.completedWordSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useSyncProgress({
    userId, isLoaded, cacheStatus, state, cachedProgress,
    contextDiscoveredRoots, discoveredWordsByRoot,
    saveProgress, updateCache, updateDiscoveredRoots, updateDiscoveredWordsByRoot,
  })

  const hasRestoredFromSupabase = useRef(false)
  useEffect(() => {
    if (!userId || cacheStatus !== 'ready' || hasRestoredFromSupabase.current) return
    hasRestoredFromSupabase.current = true
    if (!cachedProgress) return
    dispatch({
      type: 'INIT_FROM_CACHE',
      cached: {
        highestWordOrder: cachedProgress.highestWordOrder ?? 0,
        currentStageIndex: cachedProgress.currentStageIndex ?? 1,
        currentWordOrder: cachedProgress.currentWordOrder ?? 1,
        typedChars: cachedProgress.typedChars ?? 0,
      },
      settings: cachedProgress.settings || {},
    })
    const targetStage = cachedProgress.currentStageIndex || 1
    if (targetStage !== loaderStageIndex) {
      jumpToStage(targetStage)
    }
  }, [cacheStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useGameKeyboard(versesDispatch, resetProgress, resetDiscoveredRoots, clearCache, setIsTyping)

  const { handleKey: handleMobileKey, handleSpace: handleMobileSpace } = useMobileKeyboard(versesDispatch)

  useEffect(() => {
    const handleMouseMove = () => setIsTyping(false)
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const { errorCount, wrongHebKeys } = state

  const bookLabel = chapterMeta?.book ?? 'Genesis'
  const chapterNum = chapterMeta?.chapter ?? 1

  const currentVerseIdx = findVerseIndex(verses, state.currentWordOrder)
  const verse = verses[currentVerseIdx] ?? null
  const activeWord = findWord(verses, state.currentWordOrder)
  const wordId = activeWord?.heb_consonant ?? ''
  const wordDone = state.currentWordOrder <= state.highestWordOrder
  const verseDone = verse ? isVerseDone(verse, state.highestWordOrder) : false
  const activeWordIdx = verse ? verse.words.findIndex(w => w.word_order === state.currentWordOrder) : -1

  const wordData = wordId ? getWord(wordId) : null
  const encounterCount = wordId ? (state.wordEncounters[wordId] || 0) : 0
  const sbl = activeWord?.sbl || ''

  if (wordId !== prevWordIdRef.current) {
    if (prevWordIdRef.current) shownNewWordIdsRef.current.add(prevWordIdRef.current)
    prevWordIdRef.current = wordId
  }
  const isWordNew = wordDone && !!wordId && encounterCount === 1 && !shownNewWordIdsRef.current.has(wordId)

  const currentWordContext = wordDone && wordData && verse ? {
    heb_consonant: wordId,
    sbl,
    gloss: wordData.gloss,
    root: wordData.root || '',
    rootSbl: wordData.root_sbl || '',
    verse: verse.verse,
    chapter: chapterNum,
    verseGloss: getGlossText(verse.words),
  } : null

  useAudioEffects(state, verseDone, currentVerseIdx)

  const targetLetter = (activeWord && !wordDone) ? wordId[state.typedChars] : null

  if (chapterLoading || !verse) {
    return (
      <div className="game-panel">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading {bookLabel} {chapterNum}...</p>
          <LoadingEscapeButton />
        </div>
      </div>
    )
  }

  const transitionClass = chapterTransition !== 'idle' ? ` chapter-${chapterTransition}` : ''

  return (
    <div
      className={`game-panel${isTyping ? ' cursor-none' : ''}${isMobile ? ' game-panel--mobile' : ''}${transitionClass}`}
      style={{
        ...(isMobile && mobileBottomH > 0 ? { paddingBottom: `${mobileBottomH}px` } : {}),
        '--mob-heb-size': `${mobFontSize}px`,
      }}
    >

      <div className="verse-header">
        <span className="verse-ref">{bookLabel} {chapterNum}:{verse.verse}</span>
        <span className="progress-pill">verse {currentVerseIdx + 1} of {verses.length}</span>
      </div>

      <div className="main-content-grid">
        {/* Haber sidebar overlay */}
        {isMobile ? (
          <div
            className={`haber-overlay${haberOpen ? ' haber-overlay--open' : ''}`}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setHaberOpen(false) }}
            aria-hidden={!haberOpen}
          >
            <div className="haber-sidebar">
              <div className="wds-handle" onPointerDown={() => setHaberOpen(false)} aria-label="Close Haber" />
              {haberOpen && currentWordContext && (
                <HaberPanel
                  currentWordContext={currentWordContext}
                  haberSessions={haberSessions}
                  setHaberSessions={setHaberSessions}
                  onClose={() => setHaberOpen(false)}
                />
              )}
            </div>
          </div>
        ) : (
          haberOpen && currentWordContext && (
            <div className="haber-sidebar">
              <HaberPanel
                currentWordContext={currentWordContext}
                haberSessions={haberSessions}
                setHaberSessions={setHaberSessions}
                onClose={() => setHaberOpen(false)}
              />
            </div>
          )
        )}

        {/* Left column: Word Definition Tabs — hidden on mobile (WordDefSheet used instead) */}
        <div className="word-definition-column">
          <WordDefTabs
            word={wordData}
            activeWord={activeWord}
            lemmaMap={lemmaMap}
            wordId={wordId}
            sbl={sbl}
            encounterCount={encounterCount}
            isWordCompleted={wordDone}
            onOpenHaber={() => setHaberOpen(true)}
            isWordNew={isWordNew}
            userId={userId}
            book={bookLabel}
            chapter={chapterNum}
            verseNumber={verse.verse}
          />
        </div>

        {/* Right column: Game content + keyboard */}
        <div className="game-content-column">
          <div className="verse-scroll-area">
            <VerseScroll
              verses={verses}
              currentWordOrder={state.currentWordOrder}
              highestWordOrder={state.highestWordOrder}
              typedChars={state.typedChars}
              dispatch={versesDispatch}
              showSBLWord={state.showSBLWord}
              showSBLLetter={state.showSBLLetter}
              showGloss={state.showGloss}
              showNikud={state.showNikud}
              expertMode={state.expertMode}
            />
          </div>

          <div className="bottom-strip">
            {!isMobile && state.showTAHOT && (
              <TAHOTStrip
                words={verse.words}
                activeWordIndex={activeWordIdx}
              />
            )}

            {/* Desktop QWERTY keyboard — hidden on mobile */}
            <KeyboardGuide
              rows={KEYBOARD_ROWS}
              keys={KEYS}
              targetHeb={state.expertMode ? null : targetLetter}
              showActiveKey={!state.expertMode && activeWord && !wordDone && errorCount >= 3}
              wrongHebKeys={wrongHebKeys}
              showSBLWord={state.showSBLWord}
              showSBLLetter={state.showSBLLetter}
              showGloss={state.showGloss}
              showTAHOT={state.showTAHOT}
              showNikud={state.showNikud}
              expertMode={state.expertMode}
              onToggleSBLWord={() => dispatch({ type: 'TOGGLE_SBL_WORD' })}
              onToggleSBLLetter={() => dispatch({ type: 'TOGGLE_SBL_LETTER' })}
              onToggleGloss={() => dispatch({ type: 'TOGGLE_GLOSS' })}
              onToggleTAHOT={() => dispatch({ type: 'TOGGLE_TAHOT' })}
              onToggleNikud={() => dispatch({ type: 'TOGGLE_NIKUD' })}
              onToggleExpertMode={() => dispatch({ type: 'TOGGLE_EXPERT_MODE' })}
            />

            <div className="footer-note">
              {bookLabel} {chapterNum}:{verse.verse} — Masoretic Text (BHS) — TAHOT Gloss
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: ESV + carousel floating above keyboard, keyboard with pill row — all fixed to bottom */}
      {isMobile && (
        <div className="mobile-bottom-fixed" ref={mobileBottomRef}>
          <div className="mobile-floating-strip">
            {state.showTAHOT && (
              <TAHOTStrip
                words={verse.words}
                activeWordIndex={activeWordIdx}
              />
            )}
          </div>

          <div className="mobile-keyboard-panel">
            <div className="mobile-pill-row">
              <button
                className="mobile-pill mobile-pill--def"
                onClick={() => setWordDefSheetOpen(true)}
              >
                Definition
              </button>
              <button
                className="mobile-pill mobile-pill--customize"
                onClick={() => setCustomizeOpen(true)}
              >
                Customize
              </button>
              <div className="mobile-pill-sep" aria-hidden="true" />
              <button
                className="mobile-pill mobile-pill--font"
                onClick={decMobFont}
                disabled={mobFontSize <= 18}
                aria-label="Decrease font size"
              >A−</button>
              <button
                className="mobile-pill mobile-pill--font"
                onClick={incMobFont}
                disabled={mobFontSize >= 28}
                aria-label="Increase font size"
              >A+</button>
            </div>
            <MobileHebrewKeyboard
              targetHeb={state.expertMode ? null : targetLetter}
              wrongHebKeys={wrongHebKeys}
              showActiveKey={!state.expertMode && activeWord && !wordDone && errorCount >= 3}
              onKey={handleMobileKey}
              onSpace={handleMobileSpace}
              onPrevVerse={() => versesDispatch({ type: 'MOVE_VERSE', dir: -1 })}
              onNextVerse={() => versesDispatch({ type: 'MOVE_VERSE', dir: 1 })}
              showSBLLetter={state.showSBLLetter}
              showSBLWord={state.showSBLWord}
              expertMode={state.expertMode}
            />
          </div>
        </div>
      )}

      {/* Mobile: Word definition bottom sheet */}
      {isMobile && (
        <WordDefSheet
          open={wordDefSheetOpen}
          onClose={() => setWordDefSheetOpen(false)}
          word={wordData}
          activeWord={activeWord}
          lemmaMap={lemmaMap}
          wordId={wordId}
          sbl={sbl}
          encounterCount={encounterCount}
          isWordCompleted={wordDone}
          onOpenHaber={() => { setWordDefSheetOpen(false); setHaberOpen(true) }}
          isWordNew={isWordNew}
        />
      )}

      {/* Mobile: Customize bottom sheet */}
      {isMobile && (
        <div
          className={`customize-overlay${customizeOpen ? ' customize-overlay--open' : ''}`}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setCustomizeOpen(false) }}
          aria-hidden={!customizeOpen}
        >
          <div className="customize-sheet"  role="dialog" aria-label="Customize display options">
            <div className="wds-handle" onClick={() => setCustomizeOpen(false)} />
            <h3 className="customize-sheet-title">Customize</h3>

            <div className="customize-rows">
              {/* SBL Letter */}
              <button
                className={`customize-row${state.expertMode ? ' customize-row--locked' : ''}`}
                onClick={() => { if (!state.expertMode) dispatch({ type: 'TOGGLE_SBL_LETTER' }) }}
                disabled={state.expertMode}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">SBL Letter</span>
                  <span className="customize-row-desc">Show transliteration below each letter</span>
                </div>
                <div className={`customize-toggle${state.showSBLLetter && !state.expertMode ? ' customize-toggle--on' : ''}`} />
              </button>

              {/* SBL Word */}
              <button
                className={`customize-row${state.expertMode ? ' customize-row--locked' : ''}`}
                onClick={() => { if (!state.expertMode) dispatch({ type: 'TOGGLE_SBL_WORD' }) }}
                disabled={state.expertMode}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">SBL Word</span>
                  <span className="customize-row-desc">Show full word transliteration</span>
                </div>
                <div className={`customize-toggle${state.showSBLWord && !state.expertMode ? ' customize-toggle--on' : ''}`} />
              </button>

              {/* TAHOT */}
              <button
                className="customize-row"
                onClick={() => dispatch({ type: 'TOGGLE_TAHOT' })}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">TAHOT Gloss</span>
                  <span className="customize-row-desc">Show word-by-word English glosses</span>
                </div>
                <div className={`customize-toggle${state.showTAHOT ? ' customize-toggle--on' : ''}`} />
              </button>

              {/* Nikud */}
              <button
                className="customize-row"
                onClick={() => dispatch({ type: 'TOGGLE_NIKUD' })}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">Nikud</span>
                  <span className="customize-row-desc">Show vowel points on Hebrew text</span>
                </div>
                <div className={`customize-toggle${state.showNikud ? ' customize-toggle--on' : ''}`} />
              </button>

              {/* Word Gloss */}
              <button
                className="customize-row"
                onClick={() => dispatch({ type: 'TOGGLE_GLOSS' })}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">Word Gloss</span>
                  <span className="customize-row-desc">Show gloss on the active word</span>
                </div>
                <div className={`customize-toggle${state.showGloss ? ' customize-toggle--on' : ''}`} />
              </button>

              {/* Expert Mode */}
              <button
                className="customize-row customize-row--expert"
                onClick={() => dispatch({ type: 'TOGGLE_EXPERT_MODE' })}
              >
                <div className="customize-row-label">
                  <span className="customize-row-title">Expert Mode</span>
                  <span className="customize-row-desc">Hides all hints — no transliteration</span>
                </div>
                <div className={`customize-toggle customize-toggle--expert${state.expertMode ? ' customize-toggle--on' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
