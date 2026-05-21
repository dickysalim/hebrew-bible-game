import './WordDefinition.css'

// Build an array of prefix or suffix entries that actually have data
function collectParticles(row, type) {
  const particles = []
  for (let n = 1; n <= 3; n++) {
    const strongs = row[`${type}_${n}_strongs_code`]
    if (!strongs) continue
    particles.push({
      strongs,
      heb:   row[`${type}_${n}_heb_consonant`] || row[`${type}_${n}_heb_nikud`] || '',
      sbl:   row[`${type}_${n}_sbl_transliteration`] || '',
      gloss: row[`${type}_${n}_gloss`] || '',
    })
  }
  return particles
}

function SectionLabel({ children }) {
  return <p className="wd-section-label">{children}</p>
}

function Divider() {
  return <div className="wd-divider" />
}

// ---------------------------------------------------------------------------
// Main component
// lemmaMap is now keyed by word_order → contextual_word_meaning row
// ---------------------------------------------------------------------------
export default function WordDefinition({ word: activeWord, lemmaMap, wordId, sbl, isWordCompleted = false, noWrapper = false }) {

  const content = (() => {
    // ── No word selected ────────────────────────────────────────────────────
    if (!activeWord || !wordId) {
      return (
        <div className="wd-empty-inner">
          <span className="wd-empty-icon">𐤀</span>
          <p>Select a word to see its definition</p>
        </div>
      )
    }

    // ── Word not yet typed — locked ──────────────────────────────────────────
    if (!isWordCompleted) {
      return (
        <div className="wd-locked">
          <span className="wd-locked__icon">🔒</span>
          <p>Type this word to unlock its definition</p>
        </div>
      )
    }

    // ── Cache still loading ──────────────────────────────────────────────────
    if (lemmaMap === null) {
      return (
        <div className="wd-loading">
          <div className="wd-loading-spinner" />
          <p>Loading chapter lexicon…</p>
        </div>
      )
    }

    // ── Lookup by word_order ─────────────────────────────────────────────────
    const row = activeWord.word_order != null ? (lemmaMap[activeWord.word_order] ?? null) : null

    // No CWM data for this word yet
    if (!row) {
      return (
        <div className="wd-word-scroll">
          <div className="wd-identity">
            <div className="wd-identity__hebrew">{wordId}</div>
            <div className="wd-identity__sbl">{sbl}</div>
            <div className="wd-identity__gloss">{activeWord.gloss}</div>
          </div>
          <Divider />
          <p className="wd-no-root">No lexical data available for this word yet.</p>
        </div>
      )
    }

    // ── Derive particles ─────────────────────────────────────────────────────
    const prefixes = collectParticles(row, 'prefix')
    const suffixes = collectParticles(row, 'suffix')
    const hasParticles = prefixes.length > 0 || suffixes.length > 0

    const hasRoot = !!row.root_heb_consonant

    return (
      <div className="wd-word-scroll">

        {/* ── 1. WORD IDENTITY ─────────────────────────────────────────── */}
        <div className="wd-identity">
          <div className="wd-identity__hebrew">{wordId}</div>
          <div className="wd-identity__sbl">{sbl}</div>
          <div className="wd-identity__gloss">{activeWord.gloss}</div>
        </div>

        <Divider />

        {/* ── 2. PARTICLES (only when prefix/suffix data exists) ─────────── */}
        {hasParticles && (
          <>
            <SectionLabel>Particles</SectionLabel>
            <div className="wd-particles">
              {prefixes.map((p, i) => (
                <div key={`pre-${i}`} className="wd-particle wd-particle--prefix">
                  <span className="wd-particle__type">Prefix</span>
                  <span className="wd-particle__word">{p.heb}</span>
                  <span className="wd-particle__sbl">{p.sbl}</span>
                  <span className="wd-particle__gloss">{p.gloss}</span>
                </div>
              ))}
              {suffixes.map((s, i) => (
                <div key={`suf-${i}`} className="wd-particle wd-particle--suffix">
                  <span className="wd-particle__type">Suffix</span>
                  <span className="wd-particle__word">{s.heb}</span>
                  <span className="wd-particle__sbl">{s.sbl}</span>
                  <span className="wd-particle__gloss">{s.gloss}</span>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* ── 3. LEMMA ──────────────────────────────────────────────────── */}
        <SectionLabel>Lemma</SectionLabel>
        <div className="wd-row wd-row--lemma">
          <span className="wd-row__hebrew">{row.heb_consonant || wordId}</span>
          <span className="wd-row__sbl">{row.sbl_transliteration || sbl}</span>
          <span className="wd-row__gloss">{row.word_gloss || row.gloss || activeWord.gloss}</span>
        </div>

        <Divider />

        {/* ── 4. ROOT ───────────────────────────────────────────────────── */}
        <SectionLabel>Root</SectionLabel>
        {hasRoot ? (
          <div className="wd-row wd-row--root">
            <span className="wd-row__hebrew wd-row__hebrew--root">{row.root_heb_consonant}</span>
            <span className="wd-row__sbl">{row.root_sbl_transliteration || ''}</span>
            <span className="wd-row__gloss">{row.root_gloss || ''}</span>
          </div>
        ) : (
          <p className="wd-no-root">No root linked</p>
        )}

        {/* ── 5. CONTEXTUAL MEANING (replaces BDB) ──────────────────────── */}
        <>
          <Divider />
          <SectionLabel>Contextual Meaning</SectionLabel>
          <p className={`wd-bdb${!row.contextual_meaning ? ' wd-bdb--unavailable' : ''}`}>
            {row.contextual_meaning || 'Contextual meaning not yet available'}
          </p>
        </>

      </div>
    )
  })()

  if (noWrapper) return content
  return <div className="word-definition">{content}</div>
}
