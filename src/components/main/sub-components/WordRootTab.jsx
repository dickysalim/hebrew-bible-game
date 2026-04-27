import { useMemo } from 'react'
import { useRootDiscovery } from '../../../contexts/RootDiscoveryContext'
import rootsData from '../../../data/roots.json'
import wordsData from '../../../data/words.json'

/**
 * WordRootTab — mini root detail panel shown in the game's word definition area.
 *
 * Shows:
 *  - Root Hebrew, SBL, gloss, Strong's number
 *  - BDB definition
 *  - Table of discovered words that use this root (no Concordance button)
 *
 * Props:
 *   wordId  string  — current word key (used to find its root)
 */
export default function WordRootTab({ wordId }) {
  const wordData = wordId ? wordsData.words[wordId] : null
  const rootId   = wordData?.root ?? null
  const rootData = rootId ? rootsData.roots[rootId] : null

  const { discoveredWordsByRoot } = useRootDiscovery()

  const discoveredWordKeys = useMemo(() => new Set(
    (discoveredWordsByRoot[rootId] || []).map(w => w.word ?? w)
  ), [discoveredWordsByRoot, rootId])

  const wordRows = useMemo(() => {
    if (!rootId) return []
    return Object.entries(wordsData.words)
      .filter(([key, data]) => data.root === rootId && discoveredWordKeys.has(key))
      .map(([key, data]) => ({
        hebrew: key,
        sbl: data.word_sbl ?? '—',
        pos: data.pos ?? '—',
        gloss: data.gloss ?? '—',
      }))
  }, [rootId, discoveredWordKeys])

  if (!rootData) {
    return (
      <div className="wdt-root-empty">
        <span className="wdt-root-empty__icon">🌱</span>
        <p>No root data available for this word.</p>
      </div>
    )
  }

  return (
    <div className="wdt-root">
      {/* Identity */}
      <div className="wdt-root__identity">
        <div className="wdt-root__hebrew" dir="rtl" lang="he">{rootId}</div>
        <div className="wdt-root__sbl">{rootData.sbl}</div>
        <div className="wdt-root__gloss">{rootData.gloss}</div>
        {rootData.strongs && (
          <div className="wdt-root__strongs">{rootData.strongs}</div>
        )}
      </div>

      <div className="wdt-root__divider" />

      {/* BDB Definition */}
      {rootData.bdb && (
        <>
          <p className="wdt-root__section-label">BDB Definition</p>
          <p className="wdt-root__prose">{rootData.bdb}</p>
        </>
      )}

      {/* Discovered Words */}
      <p className="wdt-root__section-label wdt-root__section-label--words">
        Words You&apos;ve Discovered
      </p>

      {wordRows.length === 0 ? (
        <p className="wdt-root__empty-words">
          No words discovered yet for this root. Keep playing!
        </p>
      ) : (
        <div className="wdt-root__table-wrap">
          <table className="wdt-root__table">
            <thead>
              <tr>
                <th>Hebrew</th>
                <th>SBL</th>
                <th>Pos</th>
                <th>Gloss</th>
              </tr>
            </thead>
            <tbody>
              {wordRows.map((row, i) => (
                <tr key={i}>
                  <td className="wdt-root__table-heb" dir="rtl" lang="he">{row.hebrew}</td>
                  <td className="wdt-root__table-sbl">{row.sbl}</td>
                  <td className="wdt-root__table-pos">{row.pos}</td>
                  <td>{row.gloss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
