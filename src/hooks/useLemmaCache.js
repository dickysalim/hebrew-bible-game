import { useState, useCallback } from 'react'

/**
 * Normalize a Strong's number to match the DB format (no leading zeros after H).
 * H0430 → H430,  H7225 → H7225
 */
export function normalizeStrongs(strongs) {
  if (!strongs) return strongs
  return strongs.replace(/^H0+/, 'H')
}

/**
 * Collect all unique normalized lemma_strongs from a chapter's verse data.
 */
function collectStrongs(chapterData) {
  const strongsSet = new Set()
  for (const verse of chapterData?.verses ?? []) {
    for (const word of verse.words ?? []) {
      if (word.lemma_strongs) strongsSet.add(normalizeStrongs(word.lemma_strongs))
    }
  }
  return strongsSet
}

/**
 * useLemmaCache
 *
 * Returns [lemmaMap, refreshLemmaCache].
 * - lemmaMap: the current chapter's lemma data (null = loading, {} = empty/error)
 * - refreshLemmaCache(chapterData): call imperatively whenever a new chapter loads
 */
export function useLemmaCache() {
  const [lemmaMap, setLemmaMap] = useState(null)

  const refreshLemmaCache = useCallback((chapterData) => {
    if (!chapterData) {
      setLemmaMap(null)
      return
    }

    // Reset to loading state immediately
    setLemmaMap(null)

    const strongsSet = collectStrongs(chapterData)
    console.log('[LemmaCache] refresh called for stage', chapterData.stage_index, '— strongs:', strongsSet.size)

    if (strongsSet.size === 0) {
      setLemmaMap({})
      return
    }

    const strongsParam = [...strongsSet].join(',')
    const url = `/api/lemma/batch?strongs=${encodeURIComponent(strongsParam)}`
    console.log('[LemmaCache] fetching:', url.substring(0, 120) + '...')

    fetch(url)
      .then(r => {
        console.log('[LemmaCache] response status:', r.status)
        return r.ok ? r.json() : {}
      })
      .then(data => {
        console.log('[LemmaCache] got', Object.keys(data).length, 'entries. Sample keys:', Object.keys(data).slice(0, 5))
        setLemmaMap(data)
      })
      .catch(err => {
        console.error('[LemmaCache] fetch error:', err)
        setLemmaMap({})
      })
  }, [])

  return [lemmaMap, refreshLemmaCache]
}
