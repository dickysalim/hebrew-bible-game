/**
 * useChapterLoader
 *
 * Dynamically imports chapter JSON files by stage_index. Keeps only the
 * current chapter in memory. Exposes helpers to advance to the next chapter.
 *
 * Chapter files must:
 *  - Live in src/data/verses/
 *  - Follow the naming pattern: <book>-<chapter>.json  (e.g. genesis-1.json)
 *  - Contain a top-level "stage_index" integer (1-based, sequential)
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Static chapter registry ─────────────────────────────────────────────────
// All chapters in canonical order, keyed by stage_index.
// Add new chapters here as data files are created.
export const CHAPTER_REGISTRY = [
  { stageIndex: 1, id: 'genesis-1', book: 'Genesis', chapter: 1 },
  { stageIndex: 2, id: 'genesis-2', book: 'Genesis', chapter: 2 },
  // future chapters go here, e.g.:
  // { stageIndex: 3, id: 'genesis-3', book: 'Genesis', chapter: 3 },
]

// Map stage_index → registry entry for O(1) look-up
const BY_STAGE = Object.fromEntries(CHAPTER_REGISTRY.map((c) => [c.stageIndex, c]))
// Map chapter id → registry entry
const BY_ID    = Object.fromEntries(CHAPTER_REGISTRY.map((c) => [c.id, c]))

/** Dynamic import dispatcher — Vite requires explicit string literals in import() */
async function importChapterById(chapterId) {
  switch (chapterId) {
    case 'genesis-1': return (await import('../data/verses/genesis-1.json')).default
    case 'genesis-2': return (await import('../data/verses/genesis-2.json')).default
    // add cases as new chapters arrive
    default: throw new Error(`Unknown chapter id: ${chapterId}`)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {number} initialStageIndex  - which stage to start on (1-based)
 * @returns {{
 *   chapterData: object|null,   // the raw JSON (verses, book, chapter, stage_index)
 *   chapterMeta: object|null,   // registry entry for the current chapter
 *   stageIndex:  number,        // current stage index
 *   isLoading:   boolean,
 *   hasNext:     boolean,       // whether a next chapter exists
 *   jumpToStage: (si: number) => void,  // immediately switch to a different stage
 *   advanceToNext: () => void,  // advance to stage_index + 1
 * }}
 */
export function useChapterLoader(initialStageIndex = 1) {
  const [stageIndex, setStageIndex] = useState(initialStageIndex)
  const [chapterData, setChapterData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Monotonically increasing counter — bumped on every successful load so consumers
  // can reliably detect new data even when bouncing between the same two stages.
  const [loadId, setLoadId] = useState(0)

  useEffect(() => {
    let cancelled = false
    const meta = BY_STAGE[stageIndex]
    if (!meta) {
      console.error(`[useChapterLoader] No chapter registered for stage_index ${stageIndex}`)
      return
    }

    setIsLoading(true)
    importChapterById(meta.id)
      .then((data) => {
        if (!cancelled) {
          setChapterData(data)
          setIsLoading(false)
          setLoadId((prev) => prev + 1)
        }
      })
      .catch((err) => {
        console.error('[useChapterLoader] Failed to load chapter:', err)
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [stageIndex])

  const jumpToStage = useCallback((si) => {
    if (BY_STAGE[si]) setStageIndex(si)
    else console.warn(`[useChapterLoader] jumpToStage: stage ${si} not in registry`)
  }, [])

  const advanceToNext = useCallback(() => {
    const next = stageIndex + 1
    if (BY_STAGE[next]) setStageIndex(next)
    else console.log('[useChapterLoader] No next chapter — end of canon reached!')
  }, [stageIndex])

  const goToPrev = useCallback(() => {
    const prev = stageIndex - 1
    if (BY_STAGE[prev]) setStageIndex(prev)
    else console.log('[useChapterLoader] No previous chapter — already at beginning!')
  }, [stageIndex])

  const chapterMeta = BY_STAGE[stageIndex] ?? null
  const hasNext = Boolean(BY_STAGE[stageIndex + 1])
  const hasPrev = Boolean(BY_STAGE[stageIndex - 1])

  return { chapterData, chapterMeta, stageIndex, isLoading, loadId, hasNext, hasPrev, jumpToStage, advanceToNext, goToPrev }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve stage_index from a chapter id string */
export function stageIndexFromId(chapterId) {
  return BY_ID[chapterId]?.stageIndex ?? 1
}

/** Resolve chapter id from a stage_index */
export function idFromStageIndex(stageIndex) {
  return BY_STAGE[stageIndex]?.id ?? null
}
