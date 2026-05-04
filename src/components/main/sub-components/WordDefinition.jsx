import { normalizeStrongs } from '../../../hooks/useLemmaCache'
import PARTICLES from '../../../data/particles.json'
import './WordDefinition.css'

// Strip Hebrew nikud (vowel points U+0591–U+05C7) — never display them
const stripNikud = str => str ? str.replace(/[\u0591-\u05C7]/g, '') : str

// Particle lookup — backed by src/data/particles.json
function lookupParticleGloss(strongs) {
  return PARTICLES[strongs] ?? { word: strongs, sbl: strongs, gloss: '(unknown particle)' }
}

function SectionLabel({ children }) {
  return <p className="wd-section-label">{children}</p>
}

function Divider() {
  return <div className="wd-divider" />
}

// ---------------------------------------------------------------------------
// Main component
// Reads from lemmaMap (chapter-level cache) — no per-word fetch.
// ---------------------------------------------------------------------------
export default function WordDefinition({ word: activeWord, lemmaMap, wordId, sbl, noWrapper = false }) {

  const content = (() => {
    // ── No word selected ───────────────────────────────────────────────────
    if (!activeWord || !wordId) {
      return (
        <div className="wd-empty-inner">
          <span className="wd-empty-icon">𐤀</span>
          <p>Select a word to see its definition</p>
        </div>
      )
    }

    // ── Cache still loading ─────────────────────────────────────────────────
    if (lemmaMap === null) {
      return (
        <div className="wd-loading">
          <div className="wd-loading-spinner" />
          <p>Loading chapter lexicon…</p>
        </div>
      )
    }

    // ── Derived values ──────────────────────────────────────────────────────
    const lemmaStrongs   = activeWord.lemma_strongs ?? null
    const prefixStrongs  = activeWord.prefix_strongs ?? null
    const suffixStrongs  = activeWord.suffix_strongs ?? null
    const prefixParticle = prefixStrongs ? lookupParticleGloss(prefixStrongs) : null
    const suffixParticle = suffixStrongs ? lookupParticleGloss(suffixStrongs) : null

    // Normalize before cache lookup (H0430 → H430 to match DB format)
    const normalizedStrongs = normalizeStrongs(lemmaStrongs)
    const entry = normalizedStrongs ? (lemmaMap[normalizedStrongs] ?? null) : null
    const lemma = entry?.lemma ?? null
    const root  = entry?.root  ?? null

    return (
      <div className="wd-word-scroll">

        {/* ── 1. WORD IDENTITY ──────────────────────────────────────────── */}
        <div className="wd-identity">
          <div className="wd-identity__hebrew">{stripNikud(wordId)}</div>
          <div className="wd-identity__sbl">{sbl}</div>
          <div className="wd-identity__gloss">{activeWord.gloss}</div>
        </div>

        <Divider />

        {/* ── 2. PARTICLES ──────────────────────────────────────────────── */}
        {(prefixParticle || suffixParticle) && (
          <>
            <SectionLabel>Particles</SectionLabel>
            <div className="wd-particles">
              {prefixParticle && (
                <div className="wd-particle wd-particle--prefix">
                  <span className="wd-particle__type">Prefix</span>
                  <span className="wd-particle__word">{prefixParticle.word}</span>
                  <span className="wd-particle__sbl">{prefixParticle.sbl}</span>
                  <span className="wd-particle__gloss">{prefixParticle.gloss}</span>
                </div>
              )}
              {suffixParticle && (
                <div className="wd-particle wd-particle--suffix">
                  <span className="wd-particle__type">Suffix</span>
                  <span className="wd-particle__word">{suffixParticle.word}</span>
                  <span className="wd-particle__sbl">{suffixParticle.sbl}</span>
                  <span className="wd-particle__gloss">{suffixParticle.gloss}</span>
                </div>
              )}
            </div>
            <Divider />
          </>
        )}

        {/* ── 3. LEMMA ──────────────────────────────────────────────────── */}
        <SectionLabel>Lemma</SectionLabel>
        {lemma ? (
          <div className="wd-row wd-row--lemma">
            <span className="wd-row__hebrew">{stripNikud(lemma.lemma_word)}</span>
            <span className="wd-row__sbl">{lemma.lemma_sbl}</span>
            <span className="wd-row__gloss">{lemma.lemma_gloss}</span>
          </div>
        ) : (
          <div className="wd-row wd-row--placeholder">
            <span className="wd-row__strongs">{lemmaStrongs ?? '—'}</span>
            <span className="wd-row__gloss wd-row__gloss--muted">Not in lexicon</span>
          </div>
        )}

        <Divider />

        {/* ── 4. ROOT ───────────────────────────────────────────────────── */}
        <SectionLabel>Root</SectionLabel>
        {root ? (
          <div className="wd-row wd-row--root">
            <span className="wd-row__hebrew wd-row__hebrew--root">{stripNikud(root.root_word)}</span>
            <span className="wd-row__sbl">{root.root_sbl}</span>
            <span className="wd-row__gloss">{root.root_gloss}</span>
          </div>
        ) : lemma?.lemma_root_strongs ? (
          <div className="wd-row wd-row--placeholder">
            <span className="wd-row__strongs">{lemma.lemma_root_strongs}</span>
            <span className="wd-row__gloss wd-row__gloss--muted">No root data</span>
          </div>
        ) : (
          <p className="wd-no-root">No root linked</p>
        )}

        {/* ── 5. BDB ────────────────────────────────────────────────────── */}
        {(lemma?.lemma_bdb || root?.root_bdb) && (
          <>
            <Divider />
            <SectionLabel>BDB Definition</SectionLabel>
            <p className="wd-bdb">{lemma?.lemma_bdb || root?.root_bdb}</p>
          </>
        )}

      </div>
    )
  })()

  if (noWrapper) return content
  return <div className="word-definition">{content}</div>
}
