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

  const typedCounts = useMemo(() => {
    if (!cachedProgress?.chapters) return {}
    const chapterProgress = cachedProgress.chapters[selectedStageIndex]
    return chapterProgress?.typedCounts ?? {}
  }, [cachedProgress, selectedStageIndex])

  const verses = chapterData?.verses ?? []

  if (isLoading) {
    return (
      <div className="fc-panel">
        <div className="fc-loading">
          <div className="fc-loading__spinner" />
          <p>Loading {chapterMeta?.book ?? ''} {chapterMeta?.chapter ?? ''}…</p>
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
          typedCounts={typedCounts}
          selectedStageIndex={selectedStageIndex}
          onSelect={setSelectedStageIndex}
          completedStageIndexes={completedStageIndexes}
        />
      </div>
    </div>
  )
}
