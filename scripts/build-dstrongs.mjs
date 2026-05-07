/**
 * build-dstrongs.mjs
 *
 * Builds the dstrongs_chains table from:
 *   1. TAHOT/*.txt        → all unique chains, SBL transliterations, glosses, aleph_bet
 *   2. HebrewStrong.xml   → language, source_note, pos, basic bdb
 *   3. BrownDriverBriggs.xml → deeper bdb content
 *
 * Output: scripts/output/dstrongs-seed.sql  (run against D1)
 *
 * Usage:
 *   node scripts/build-dstrongs.mjs
 *   npx wrangler d1 execute hebrew-lexicon --local  --file=./scripts/output/dstrongs-seed.sql
 *   npx wrangler d1 execute hebrew-lexicon --remote --file=./scripts/output/dstrongs-seed.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DOMParser } from '@xmldom/xmldom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const RES       = path.join(ROOT, 'scripts', 'resources');
const OUT_DIR   = path.join(ROOT, 'scripts', 'output');
const OUT_FILE  = path.join(OUT_DIR, 'dstrongs-seed.sql');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip TAHOT trailing punctuation codes and instance markers from dStrongs */
function cleanChainRaw(raw) {
  let s = raw
    .replace(/\\H9\d+/g, '')          // trailing punct codes e.g. \H9016
    .replace(/_[A-Z](?=[/_}+]|$)/g, '') // instance markers _A _B inside {}
    .replace(/\+$/, '')               // carry-over marker
    .trim();
  return s;
}

/** Determine row type from the final chain string (after root is appended) */
function inferType(chain) {
  if (/^<H/.test(chain)) return 'opaque';
  if (/^\[H/.test(chain)) return 'root';
  if (/^H9\d{3}$/.test(chain)) return 'particle';
  if (/^\{H[^}]+\}\/\[H/.test(chain) && !/H9\d{3}/.test(chain.split('{')[0])) return 'lemma';
  if (/\{H/.test(chain)) return 'inflected';
  // bare H9xxx in a compound → still a particle (handled separately)
  return 'inflected';
}

/** Strip nikud / cantillation marks from Hebrew, keep consonants + slashes */
function stripNikud(heb) {
  return heb.replace(/[\u0591-\u05C7]/g, '').replace(/[/\\]/g, '');
}

/** Escape SQL string */
function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Normalize a Strongs ID for HebrewStrong.xml lookup.
 * TAHOT zero-pads to 4 digits: "H0430", "H0853".
 * HebrewStrong uses bare numbers: "H430", "H853".
 * Also strips TAHOT disambiguation suffixes (G, H, A, B…).
 */
function normalizeStrongsId(id) {
  if (!id) return id;
  // Strip trailing disambiguation letter first (H7225G → H7225)
  const bare = id.replace(/[A-Z]$/, '');
  // Remove leading zeros from numeric part (H0430 → H430)
  return bare.replace(/^(H)0+(\d)/, '$1$2');
}

// ---------------------------------------------------------------------------
// Step 1: Parse HebrewStrong.xml
// ---------------------------------------------------------------------------
console.log('📖 Parsing HebrewStrong.xml…');

const strongsRaw = fs.readFileSync(path.join(RES, 'HebrewStrong.xml'), 'utf8');
const strongsDoc = new DOMParser().parseFromString(strongsRaw, 'text/xml');
const strongsEntries = strongsDoc.getElementsByTagName('entry');

/** Map: strongs_id → { language, pos, source_note, aleph_bet, bdb_short } */
const strongsMap = {};

for (const entry of strongsEntries) {
  const id = entry.getAttribute('id'); // e.g. "H7225"
  if (!id) continue;

  const wEl      = entry.getElementsByTagName('w')[0];
  const srcEl    = entry.getElementsByTagName('source')[0];
  const meanEl   = entry.getElementsByTagName('meaning')[0];
  const usageEl  = entry.getElementsByTagName('usage')[0];

  const lang      = wEl?.getAttribute('xml:lang') || 'heb';
  const alephBet  = wEl?.textContent?.trim() || '';
  const pos       = wEl?.getAttribute('pos') || '';
  // xlit = the base-form SBL transliteration from HebrewStrong (e.g. "bārāʾ", "rēʾshîyth")
  const xlit      = wEl?.getAttribute('xlit') || '';

  // Parse root references from <w src="Hxxx"> elements inside <source>
  // This is more reliable than regex-on-text since the XML is structured
  const srcRefs = [];
  if (srcEl) {
    const srcWEls = srcEl.getElementsByTagName('w');
    for (const sw of srcWEls) {
      const src = sw.getAttribute('src');
      if (!src) continue;
      // src is already like "H7218" or "7218" — normalize to bare "H<number>"
      const normalized = src.startsWith('H') ? src : `H${src}`;
      srcRefs.push(normalized);
    }
  }
  // Primary root reference = first <w src> in source (if different from self)
  const rootRefFromXml = srcRefs.find(r => r !== id) || null;

  const sourceRaw = srcEl?.textContent?.trim() || '';
  // Strip XML tags from source for human-readable source_note
  const sourceNote = sourceRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const meaning   = meanEl?.textContent?.trim() || '';
  const usage     = usageEl?.textContent?.trim() || '';
  const bdbShort  = [meaning, usage].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  // Determine if this is opaque (no traceable Hebrew root)
  const isOpaque = /foreign origin|uncertain derivation|unused root/i.test(sourceNote);
  // Determine if this is a primitive root/word
  const isPrimitive = /primitive root|primitive word/i.test(sourceNote);

  strongsMap[id] = { lang, alephBet, xlit, pos, sourceNote, rootRefFromXml, bdbShort, isOpaque, isPrimitive };
}

console.log(`  → ${Object.keys(strongsMap).length} HebrewStrong entries loaded`);

// ---------------------------------------------------------------------------
// Step 2: Parse all TAHOT files — collect unique chains + SBL + glosses
// ---------------------------------------------------------------------------
console.log('📖 Parsing TAHOT files…');

const TAHOT_FILES = [
  'TAHOT/TAHOT-Gen-Deu.txt',
  'TAHOT/TAHOT-Jos-Est.txt',
  'TAHOT/TAHOT-Job-Sng.txt',
  'TAHOT/TAHOT-Isa-Mal.txt',
];

const BOOK_PREFIXES = new Set([
  'Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa',
  '1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro',
  'Ecc','Sng','Isa','Jer','Lam','Ezk','Dan','Hos','Joe','Amo',
  'Oba','Jon','Mic','Nah','Hab','Zep','Hag','Zec','Mal',
]);

/**
 * Map: rawChain → {
 *   sbls: Set<string>,
 *   glosses: Set<string>,
 *   hebrews: Set<string>,   // Hebrew with nikud
 *   alephBets: Set<string>, // consonants only
 *   language: "heb"|"arc",
 * }
 */
const chainData = new Map();

/** Extract the lemma strongs code from dStrongs raw chain */
function extractLemmaId(chain) {
  const m = chain.match(/\{(H\w+)\}/);
  return m ? m[1].replace(/_[A-Z]$/, '') : null;
}

/** Extract root strongs from a chain (the part after }/[H... at end) */
function extractRootRef(chain) {
  const m = chain.match(/\[H(\w+)\]$/);
  return m ? `H${m[1]}` : null;
}

for (const rel of TAHOT_FILES) {
  const filepath = path.join(RES, rel);
  if (!fs.existsSync(filepath)) { console.warn(`  ⚠️  Missing: ${rel}`); continue; }

  const lines = fs.readFileSync(filepath, 'utf8').split('\n');
  let lineCount = 0;

  for (const line of lines) {
    const prefix = line.slice(0, 3);
    if (!BOOK_PREFIXES.has(prefix)) continue;
    if (!line.includes('#')) continue;

    const cols = line.split('\t');
    if (cols.length < 5) continue;

    const heb    = cols[1]?.trim() || '';
    const sbl    = cols[2]?.trim().replace(/-$/, '') || '';
    const gloss  = cols[3]?.trim() || '';
    const dsRaw  = cols[4]?.trim() || '';
    const gram   = cols[5]?.trim() || '';

    const chain  = cleanChainRaw(dsRaw);
    if (!chain) continue;

    const lang   = gram.startsWith('A') ? 'arc' : 'heb';
    const aleph  = stripNikud(heb);

    if (!chainData.has(chain)) {
      chainData.set(chain, {
        sbls: new Set(),
        glosses: new Set(),
        hebrews: new Set(),
        alephBets: new Set(),
        language: lang,
      });
    }

    const d = chainData.get(chain);
    if (sbl)   d.sbls.add(sbl);
    if (gloss) d.glosses.add(gloss);
    if (heb)   d.hebrews.add(heb);
    if (aleph) d.alephBets.add(aleph);
    // language: if any arc occurrence, mark arc
    if (lang === 'arc') d.language = 'arc';

    lineCount++;
  }
  console.log(`  → ${rel}: ${lineCount} rows processed`);
}

console.log(`  → ${chainData.size} unique raw dStrongs chains found`);

// ---------------------------------------------------------------------------
// Step 3: Resolve root references and build final PK chains
// ---------------------------------------------------------------------------
console.log('🔗 Resolving root references…');

/**
 * For a given raw TAHOT chain, build the final PK:
 *   - Extract lemma id from {Hxxx}
 *   - Look up root in strongsMap via source_note parsing
 *   - Append [Hroot] at end (or <Hxxx> for opaque)
 */
function buildFinalChain(rawChain) {
  const lemmaId = extractLemmaId(rawChain); // e.g. "H7225G" or "H0430G" (with TAHOT suffix/padding)
  if (!lemmaId) {
    // No lemma → particle or bare particle chain (e.g. "H9003")
    return rawChain;
  }

  // Normalize: strip disambiguation letter AND leading zeros for HebrewStrong lookup
  // e.g. "H0430G" → "H430",  "H7225G" → "H7225",  "H0853" → "H853"
  const normalId = normalizeStrongsId(lemmaId);

  const entry = strongsMap[normalId] || strongsMap[lemmaId];
  if (!entry) return rawChain; // fallback — unknown Strong's

  if (entry.isOpaque) {
    // Keep the TAHOT lemma id (with suffix) inside <…> so distinctions are preserved
    const withOpaque = rawChain.replace(`{${lemmaId}}`, `<${lemmaId}>`);
    return withOpaque;
  }

  // Determine the root this lemma derives from
  let rootId = normalId; // default: self-referential (primitive root)

  // Use the structured XML root reference (from <w src="Hxxx">) — more reliable than regex
  if (entry.rootRefFromXml && entry.rootRefFromXml !== normalId) {
    rootId = entry.rootRefFromXml;
  }

  return `${rawChain}/[${rootId}]`;
}

// Build the final set of unique chains with resolved PKs
/** Map: finalPK → merged data */
const finalChains = new Map();

for (const [rawChain, data] of chainData) {
  const finalPK = buildFinalChain(rawChain);

  if (!finalChains.has(finalPK)) {
    finalChains.set(finalPK, {
      rawChain,
      sbls:      new Set(data.sbls),
      glosses:   new Set(data.glosses),
      hebrews:   new Set(data.hebrews),
      alephBets: new Set(data.alephBets),
      language:  data.language,
    });
  } else {
    const d = finalChains.get(finalPK);
    for (const s of data.sbls)      d.sbls.add(s);
    for (const g of data.glosses)   d.glosses.add(g);
    for (const h of data.hebrews)   d.hebrews.add(h);
    for (const a of data.alephBets) d.alephBets.add(a);
    if (data.language === 'arc') d.language = 'arc';
  }
}

console.log(`  → ${finalChains.size} unique final PK chains`);

// ---------------------------------------------------------------------------
// Step 4: Add standalone HebrewStrong entries not seen in TAHOT
//         (rare words, proper nouns used only once, etc.)
// ---------------------------------------------------------------------------
console.log('➕ Adding standalone HebrewStrong entries…');
let standaloneCount = 0;

for (const [sid, entry] of Object.entries(strongsMap)) {
  // Build what the lemma PK would look like
  let pk;
  if (entry.isOpaque) {
    pk = `<${sid}>`;
  } else if (entry.isPrimitive) {
    pk = `[${sid}]`;
  } else {
    // Try to find root from source note
    const rootMatch = entry.sourceNote?.match(/\b(H\d+)\b/);
    const rootId = rootMatch ? rootMatch[1] : sid;
    pk = `{${sid}}/[${rootId}]`;
  }

  if (!finalChains.has(pk)) {
    finalChains.set(pk, {
      rawChain: pk,
      sbls:      new Set(),
      glosses:   new Set([entry.bdbShort].filter(Boolean)),
      hebrews:   new Set([entry.alephBet].filter(Boolean)),
      alephBets: new Set([entry.alephBet].filter(Boolean)),
      language:  entry.lang === 'arc' ? 'arc' : 'heb',
    });
    standaloneCount++;
  }
}

console.log(`  → ${standaloneCount} additional entries added`);

// ---------------------------------------------------------------------------
// Step 5: Add known particles (H9001–H9038) as particle rows
// ---------------------------------------------------------------------------
console.log('➕ Adding TAHOT particles…');

const KNOWN_PARTICLES = {
  'H9001': { sbl: 'vav',   gloss: 'consecutive/conjunctive waw',         aleph: 'ו' },
  'H9002': { sbl: 've',    gloss: 'and (waw conjunction)',                aleph: 'וְ' },
  'H9003': { sbl: 'be',    gloss: 'in / by / with (bet preposition)',     aleph: 'בְּ' },
  'H9004': { sbl: 'ke',    gloss: 'like / as (kaf preposition)',          aleph: 'כְּ' },
  'H9005': { sbl: 'le',    gloss: 'to / for (lamed preposition)',         aleph: 'לְ' },
  'H9006': { sbl: 'mi',    gloss: 'from (mem preposition)',               aleph: 'מִ' },
  'H9007': { sbl: 'she',   gloss: 'that / which (relative marker)',       aleph: 'שֶׁ' },
  'H9008': { sbl: 'im',    gloss: 'if (conditional particle)',            aleph: 'אִם' },
  'H9009': { sbl: 'ha',    gloss: 'the (definite article)',               aleph: 'הַ' },
  'H9010': { sbl: 'h',     gloss: 'definite article (attached)',          aleph: 'ה' },
  'H9014': { sbl: 'maqef', gloss: 'maqqef (linking hyphen)',              aleph: '־' },
  'H9015': { sbl: 'paseq', gloss: 'paseq (divider)',                     aleph: '׀' },
  'H9016': { sbl: 'sof',   gloss: 'sof pasuq (verse end)',               aleph: '׃' },
  'H9017': { sbl: 'nun',   gloss: 'paragogic nun',                       aleph: 'ן' },
  'H9018': { sbl: 'he',    gloss: 'paragogic he',                        aleph: 'ה' },
  'H9021': { sbl: 'kha',   gloss: '2ms pronominal suffix "your"',        aleph: 'ךָ' },
  'H9022': { sbl: 'kh',    gloss: '2fs pronominal suffix "your"',        aleph: 'ךְ' },
  'H9023': { sbl: 'o',     gloss: '3ms pronominal suffix "his/its"',     aleph: 'וֹ' },
  'H9024': { sbl: 'ah',    gloss: '3fs pronominal suffix "her/its"',     aleph: 'הּ' },
  'H9025': { sbl: 'nu',    gloss: '1cp pronominal suffix "our"',         aleph: 'נוּ' },
  'H9026': { sbl: 'i',     gloss: '1cs pronominal suffix "my"',          aleph: 'י' },
  'H9027': { sbl: 'khem',  gloss: '2mp pronominal suffix "your"',        aleph: 'כֶם' },
  'H9028': { sbl: 'hem',   gloss: '3mp pronominal suffix "their"',       aleph: 'הֶם' },
  'H9029': { sbl: 'hen',   gloss: '3fp pronominal suffix "their"',       aleph: 'הֶן' },
  'H9030': { sbl: 'am',    gloss: 'pronominal suffix variant',           aleph: 'ם' },
  'H9033': { sbl: 'o/bo',  gloss: 'pronominal/locative suffix',          aleph: 'וֹ' },
  'H9034': { sbl: 'ah',    gloss: 'directional he suffix',               aleph: 'ה' },
  'H9038': { sbl: 'hom',   gloss: '3mp pronominal suffix "them"',        aleph: 'הֹם' },
};

let particleCount = 0;
for (const [pid, p] of Object.entries(KNOWN_PARTICLES)) {
  if (!finalChains.has(pid)) {
    finalChains.set(pid, {
      rawChain: pid,
      sbls:      new Set([p.sbl]),
      glosses:   new Set([p.gloss]),
      hebrews:   new Set([p.aleph]),
      alephBets: new Set([p.aleph]),
      language:  'heb',
    });
    particleCount++;
  }
}
console.log(`  → ${particleCount} particle rows added`);

// ---------------------------------------------------------------------------
// Step 6: Write SQL output
// ---------------------------------------------------------------------------
console.log('✍️  Writing SQL…');

const lines = [
  '-- dstrongs_chains seed data',
  `-- Generated: ${new Date().toISOString()}`,
  `-- Total rows: ${finalChains.size}`,
  '-- Note: no BEGIN TRANSACTION — D1 does not support explicit transactions in SQL files',
  '',
];

let rowCount = 0;

for (const [pk, data] of finalChains) {
  const type = inferType(pk);

  // Best single Hebrew representation (prefer with nikud, fall back to consonants)
  const bestHebrew = [...data.hebrews].sort((a, b) => b.length - a.length)[0]
                  || [...data.alephBets][0]
                  || null;

  const alephBet = [...data.alephBets].sort((a, b) => b.length - a.length)[0] || null;

  // SBL array (deduplicated, sorted)
  const sbls = [...data.sbls].filter(Boolean).sort();

  // Glosses array (deduplicated, sorted)
  const glosses = [...data.glosses].filter(Boolean).sort();

  // Look up HebrewStrong data for this entry
  // Strip TAHOT disambiguation suffix AND zero-padding to find the base entry
  const lemmaMatch  = pk.match(/\{(H\w+)\}/);
  const opaqueMatch = pk.match(/^<(H\w+)>/);
  const rootMatch2  = pk.match(/^\[(H\w+)\]$/);
  const rawLemmaId  = lemmaMatch?.[1] || opaqueMatch?.[1] || rootMatch2?.[1] || null;
  // normalizeStrongsId strips both trailing letter AND leading zeros
  const normalLemmaId = normalizeStrongsId(rawLemmaId); // e.g. "H0430G" → "H430"

  const strongsEntry = normalLemmaId
    ? (strongsMap[normalLemmaId] || strongsMap[rawLemmaId])
    : null;

  const language   = strongsEntry?.lang === 'arc' ? 'arc' : (data.language || 'heb');
  const sourceNote = strongsEntry?.sourceNote || null;
  const bdb        = strongsEntry?.bdbShort || null;
  const posArr     = strongsEntry?.pos ? [strongsEntry.pos] : [];

  // SBL strategy:
  //   - Particles: use TAHOT-aggregated SBL (no HebrewStrong entry, and particle forms are stable)
  //   - Lemma / root / opaque / inflected: use xlit from HebrewStrong (base form only)
  //     Fall back to TAHOT-aggregated SBL only if xlit is absent
  let finalSbls;
  if (type === 'particle') {
    finalSbls = sbls; // already deduplicated from TAHOT
  } else {
    const xlitBase = strongsEntry?.xlit || null;
    finalSbls = xlitBase ? [xlitBase] : sbls;
  }

  // aleph_bet: prefer HebrewStrong's canonical form; fall back to TAHOT surface forms
  const canonicalAleph = strongsEntry?.alephBet || alephBet || bestHebrew;

  lines.push(
    `INSERT OR IGNORE INTO dstrongs_chains ` +
    `(dstrongs_chain, type, language, aleph_bet, sbl_transliterations, glosses, pos, bdb, source_note) VALUES (` +
    [
      sqlStr(pk),
      sqlStr(type),
      sqlStr(language),
      sqlStr(canonicalAleph),
      sqlStr(finalSbls.length ? JSON.stringify(finalSbls) : null),
      sqlStr(glosses.length   ? JSON.stringify(glosses)   : null),
      sqlStr(posArr.length    ? JSON.stringify(posArr)    : null),
      sqlStr(bdb),
      sqlStr(sourceNote),
    ].join(', ') +
    `);`
  );

  rowCount++;
  if (rowCount % 1000 === 0) process.stdout.write(`\r  → ${rowCount} rows…`);
}

lines.push('');
lines.push(`-- Total: ${rowCount} rows inserted`);

fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');

console.log(`\n✅ Done — ${rowCount} rows written to ${path.relative(ROOT, OUT_FILE)}`);
console.log('');
console.log('Next steps:');
console.log('  1. npx wrangler d1 execute hebrew-lexicon --local  --file=./schema-dstrongs.sql');
console.log('  2. npx wrangler d1 execute hebrew-lexicon --local  --file=./scripts/output/dstrongs-seed.sql');
console.log('  3. npx wrangler d1 execute hebrew-lexicon --remote --file=./schema-dstrongs.sql');
console.log('  4. npx wrangler d1 execute hebrew-lexicon --remote --file=./scripts/output/dstrongs-seed.sql');
