// src/lib/lexiconCache.js
// ---------------------------------------------------------------------------
// Shared in-memory cache for word and root data, fetched once from the D1
// API on first use and then served synchronously from memory.
//
// This replaces direct `import wordsData from '../data/words.json'` calls
// while keeping the same synchronous access pattern the game engine needs.
// ---------------------------------------------------------------------------

const cache = {
  words: null,  // { [hebrew]: wordEntry }
  roots: null,  // { [strongs]: rootEntry }
  wordPromise: null,
  rootPromise: null,
}

// ---------------------------------------------------------------------------
// Fetch helpers — called once each, results stored in cache
// ---------------------------------------------------------------------------

async function fetchAllWords() {
  if (cache.words) return cache.words
  if (cache.wordPromise) return cache.wordPromise

  cache.wordPromise = (async () => {
    let page = 1
    const allWords = {}

    while (true) {
      const res = await fetch(`/api/lexicon?limit=50&page=${page}`)
      if (!res.ok) throw new Error(`Lexicon fetch failed: ${res.status}`)
      const { words, pages } = await res.json()

      for (const w of words) {
        // /api/lexicon returns light rows; fetch full data individually only
        // if explanation is missing (it's omitted in the list view for perf)
        allWords[w.hebrew] = w
      }

      if (page >= pages) break
      page++
    }

    cache.words = allWords
    return allWords
  })()

  return cache.wordPromise
}

async function fetchAllRoots() {
  if (cache.roots) return cache.roots
  if (cache.rootPromise) return cache.rootPromise

  cache.rootPromise = (async () => {
    // Roots are only ~484 entries — fetch them all in a single dedicated call
    const res = await fetch('/api/lexicon/roots')
    if (!res.ok) throw new Error(`Roots fetch failed: ${res.status}`)
    const data = await res.json()

    const rootsMap = {}
    for (const r of data.roots) {
      rootsMap[r.strongs] = r
    }

    cache.roots = rootsMap
    return rootsMap
  })()

  return cache.rootPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prime the cache. Call this once at app startup (e.g. in App.jsx) so data
 * is ready before the game needs it. Returns a Promise.
 */
export async function primeLexiconCache() {
  await Promise.all([fetchAllWords(), fetchAllRoots()])
}

/**
 * Synchronous word lookup — returns null if cache not yet loaded or word not found.
 * Always call `primeLexiconCache()` at startup to guarantee data is available.
 */
export function getWord(hebrew) {
  return cache.words?.[hebrew] ?? null
}

/**
 * Synchronous root lookup by Strong's number.
 */
export function getRoot(strongs) {
  return cache.roots?.[strongs] ?? null
}

/**
 * Returns all words as { [hebrew]: wordEntry } — same shape as wordsData.words
 */
export function getAllWords() {
  return cache.words ?? {}
}

/**
 * Returns all roots as { [strongs]: rootEntry } — same shape as rootsData.roots
 */
export function getAllRoots() {
  return cache.roots ?? {}
}

/**
 * Fetch a single word with full data (including explanation) from D1.
 * Use this for the detail views (WordRootTab, ConcordancePanel).
 */
export async function fetchWord(hebrew) {
  // Check cache first
  const cached = cache.words?.[hebrew]
  if (cached?.explanation) return cached

  const res = await fetch(`/api/word/${encodeURIComponent(hebrew)}`)
  if (!res.ok) return null
  const data = await res.json()

  // Update cache with full data
  if (cache.words) cache.words[hebrew] = data
  return data
}

/**
 * Fetch a single root with full data from D1.
 */
export async function fetchRoot(strongs) {
  const cached = cache.roots?.[strongs]
  if (cached?.explanation) return cached

  const res = await fetch(`/api/root/${encodeURIComponent(strongs)}`)
  if (!res.ok) return null
  const data = await res.json()

  if (cache.roots) cache.roots[strongs] = data
  return data
}

/**
 * Total root count for the "X of Y roots collected" display.
 * Falls back to 0 if cache isn't loaded yet.
 */
export function getTotalRootsCount() {
  return cache.roots ? Object.keys(cache.roots).length : 0
}
