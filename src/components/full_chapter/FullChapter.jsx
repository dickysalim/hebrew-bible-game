import { useState, useMemo } from 'react'
import { useChapterLoader, CHAPTER_REGISTRY } from '../../utils/useChapterLoader'
import { useProgressCache } from '../../contexts/ProgressCacheContext'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'
import './FullChapter.css'

// ─── Main FullChapter Component ───────────────────────────────────────────────

export default function FullChapter({ userId }) {
  const { cachedProgress } = useProgressCache()

  const completedStageIndexes = useMemo(() => {
    const set = new Set()
    const chapters = cachedProgress?.chapters ?? {}
    CHAPTER_REGISTRY.forEach(entry => {
      const chProgress = chapters[entry.stageIndex]
      if ((chProgress?.highestVerse ?? 0) >= entry.totalVerses) {
        set.add(entry.stageIndex)
      }
    })
    return set
  }, [cachedProgress])

  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    const chapters = cachedProgress?.chapters ?? {}
    const first = CHAPTER_REGISTRY.find(e =>
      (chapters[e.stageIndex]?.highestVerse ?? 0) >= e.totalVerses
    )
    return first?.stageIndex ?? 1
  })

  const { chapterData, chapterMeta, isLoading } = useChapterLoader(selectedStageIndex)


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
      {/* Two-column reader — dropdown bar is now inside the right panel toolbar */}
      <div className="fc-reader">
        <LeftPanel userId={userId} chapterMeta={chapterMeta} />
        <RightPanel
          verses={verses}
          chapterMeta={chapterMeta}
          selectedStageIndex={selectedStageIndex}
          onSelect={setSelectedStageIndex}
          completedStageIndexes={completedStageIndexes}
          userId={userId}
        />
      </div>
    </div>
  )
}
