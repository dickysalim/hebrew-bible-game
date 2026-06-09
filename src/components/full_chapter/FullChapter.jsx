import { useState, useMemo, useEffect } from 'react'
import { useChapterLoader, CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import { useLemmaCache } from '../../hooks/useLemmaCache'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'
import './FullChapter.css'

// ─── Main FullChapter Component ───────────────────────────────────────────────

export default function FullChapter({ userId }) {
  const { cachedProgress } = useProgressCache()

  const completedStageIndexes = useMemo(() => {
    const set = new Set()
    const hw = cachedProgress?.highestWordOrder ?? 0
    CHAPTER_REGISTRY.forEach(entry => {
      if (hw >= entry.lastWordOrder) {
        set.add(entry.stageIndex)
      }
    })
    return set
  }, [cachedProgress])

  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    const hw = cachedProgress?.highestWordOrder ?? 0
    const currentSi = cachedProgress?.currentStageIndex ?? 1

    // If current chapter is completed, show it
    const currentEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === currentSi)
    if (currentEntry && hw >= currentEntry.lastWordOrder) return currentSi

    // Otherwise show the last completed chapter
    const lastCompleted = [...CHAPTER_REGISTRY].reverse().find(e => hw >= e.lastWordOrder)
    return lastCompleted?.stageIndex ?? 1
  })

  const { chapterData, chapterMeta, isLoading } = useChapterLoader(selectedStageIndex)

  // Lemma cache — refreshed whenever a new chapter loads
  const [lemmaMap, refreshLemmaCache] = useLemmaCache()
  useEffect(() => {
    if (chapterData) refreshLemmaCache(chapterData)
  }, [chapterData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Selected word for the word-detail panel
  // { word: { id, sbl, gloss, ... }, verseObj: { verse, words } }
  const [selectedWord, setSelectedWord] = useState(null)

  const handleWordClick = (word, verseObj) => setSelectedWord({ word, verseObj })

  const verses = chapterData?.verses ?? []

  // Lock screen — shown until the user finishes at least one chapter
  const isLocked = completedStageIndexes.size === 0

  if (isLoading && !isLocked) {
    return (
      <div className="fc-panel">
        <div className="fc-loading">
          <div className="fc-loading__spinner" />
          <p>Loading {chapterMeta?.book ?? ''} {chapterMeta?.chapter ?? ''}…</p>
        </div>
      </div>
    )
  }

  if (isLocked) {
    return (
      <div className="fc-panel">
        <div className="fc-lock">
          <div className="fc-lock__icon" aria-hidden="true">🔒</div>
          <h2 className="fc-lock__title">Full Chapter Reader</h2>
          <p className="fc-lock__body">
            Complete <strong>Genesis 1</strong> in the main game to unlock this panel.
          </p>
          <div className="fc-lock__verse">
            <p className="fc-lock__verse-heb" lang="he" dir="rtl">
              אלהים אלי אתה אשחרך
            </p>
            <p className="fc-lock__verse-eng">
              "God, you are my God. I will earnestly seek you."
            </p>
            <span className="fc-lock__verse-ref">Psalm 63:1 · WEB</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-panel">
      <div className="fc-reader">
        <LeftPanel
          userId={userId}
          chapterMeta={chapterMeta}
          selectedWord={selectedWord}
          lemmaMap={lemmaMap}
        />
        <RightPanel
          verses={verses}
          chapterMeta={chapterMeta}
          selectedStageIndex={selectedStageIndex}
          onSelect={setSelectedStageIndex}
          completedStageIndexes={completedStageIndexes}
          userId={userId}
          selectedWord={selectedWord}
          onWordClick={handleWordClick}
          onCloseWord={() => setSelectedWord(null)}
          lemmaMap={lemmaMap}
        />
      </div>
    </div>
  )
}
