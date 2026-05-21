import { useState, useCallback } from 'react'

/**
 * Collect all unique word_order integers from a chapter’s verse data.
 */
function collectWordOrders(chapterData) {
  const orders = new Set()
  for (const verse of chapterData?.verses ?? []) {
    for (const word of verse.words ?? []) {
      if (word.word_order != null) orders.add(word.word_order)
    }
  }
  return orders
}

/**
 * useLemmaCache
 *
 * Returns [lemmaMap, refreshLemmaCache].
 * - lemmaMap: keyed by word_order → contextual_word_meaning row (null = loading)
 * - refreshLemmaCache(chapterData): call whenever a new chapter loads
 */
export function useLemmaCache() {
  const [lemmaMap, setLemmaMap] = useState(null)

  const refreshLemmaCache = useCallback((chapterData) => {
    if (!chapterData) {
      setLemmaMap(null)
      return
    }

    setLemmaMap(null)

    const orderSet = collectWordOrders(chapterData)
    console.log('[CWMCache] refresh for stage', chapterData.stage_index, '— word_orders:', orderSet.size)

    if (orderSet.size === 0) {
      setLemmaMap({})
      return
    }

    fetch('/api/cwm/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_orders: [...orderSet] }),
    })
      .then(r => r.ok ? r.json() : (console.warn('[CWMCache] non-ok response:', r.status), {}))
      .then(data => {
        console.log('[CWMCache] got', Object.keys(data).length, 'entries. Sample keys:', Object.keys(data).slice(0, 5))
        setLemmaMap(data)
      })
      .catch(err => {
        console.error('[CWMCache] fetch error:', err)
        setLemmaMap({})
      })
  }, [])

  return [lemmaMap, refreshLemmaCache]
}
