import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { DOMParser } from '@xmldom/xmldom';

// ── helpers ───────────────────────────────────────────────────────────────────

function stripNikud(str) {
  if (!str) return '';
  return str.replace(/[\u0591-\u05C7]/g, '').replace(/\//g, '');
}

// Flip trailing possessive pronoun to natural English order.
// "breath my"      → "my breath"
// "son his"        → "his son"
// "and house his"  → "and his house"
// "to call out my" → "to my call out"
// Strategy: peel off any leading conjunction/preposition tokens one at a time,
// then treat everything up to the trailing possessive as the noun phrase.
function flipPossessive(gloss) {
  const POSSESSIVES = /^(his|her|its|their|our|your|my)$/i;
  const DETACHABLE  = /^(and|or|but|the|a|an|with|to|in|for|from|by|of|about|near|above|below|beside|under|over|at|on)$/i;

  const tokens = gloss.trim().split(/\s+/);
  if (tokens.length < 2) return gloss;

  const last = tokens[tokens.length - 1];
  if (!POSSESSIVES.test(last)) return gloss;

  // Peel leading detachable tokens into a prefix
  let prefixEnd = 0;
  while (prefixEnd < tokens.length - 2 && DETACHABLE.test(tokens[prefixEnd])) {
    prefixEnd++;
  }

  const prefix = prefixEnd > 0 ? tokens.slice(0, prefixEnd).join(' ') + ' ' : '';
  const noun   = tokens.slice(prefixEnd, tokens.length - 1).join(' ');
  const poss   = last;

  return `${prefix}${poss} ${noun}`;
}

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

function attr(node, name) {
  if (!node || !node.getAttribute) return '';
  return node.getAttribute(name) || '';
}

function getText(node) {
  if (!node) return '';
  let result = '';
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === 3) result += child.nodeValue;
    else result += getText(child);
  }
  return result.replace(/\s+/g, ' ').trim();
}


// ── book order ────────────────────────────────────────────────────────────────

const BOOK_ORDER = [
  { file: 'Gen.xml',   name: 'genesis',       chapters: 50 },
  { file: 'Exod.xml',  name: 'exodus',        chapters: 40 },
  { file: 'Lev.xml',   name: 'leviticus',     chapters: 27 },
  { file: 'Num.xml',   name: 'numbers',       chapters: 36 },
  { file: 'Deut.xml',  name: 'deuteronomy',   chapters: 34 },
  { file: 'Josh.xml',  name: 'joshua',        chapters: 24 },
  { file: 'Judg.xml',  name: 'judges',        chapters: 21 },
  { file: 'Ruth.xml',  name: 'ruth',          chapters: 4  },
  { file: '1Sam.xml',  name: '1-samuel',      chapters: 31 },
  { file: '2Sam.xml',  name: '2-samuel',      chapters: 24 },
  { file: '1Kgs.xml',  name: '1-kings',       chapters: 22 },
  { file: '2Kgs.xml',  name: '2-kings',       chapters: 25 },
  { file: '1Chr.xml',  name: '1-chronicles',  chapters: 29 },
  { file: '2Chr.xml',  name: '2-chronicles',  chapters: 36 },
  { file: 'Ezra.xml',  name: 'ezra',          chapters: 10 },
  { file: 'Neh.xml',   name: 'nehemiah',      chapters: 13 },
  { file: 'Esth.xml',  name: 'esther',        chapters: 10 },
  { file: 'Job.xml',   name: 'job',           chapters: 42 },
  { file: 'Ps.xml',    name: 'psalms',        chapters: 150 },
  { file: 'Prov.xml',  name: 'proverbs',      chapters: 31 },
  { file: 'Eccl.xml',  name: 'ecclesiastes',  chapters: 12 },
  { file: 'Song.xml',  name: 'song',          chapters: 8  },
  { file: 'Isa.xml',   name: 'isaiah',        chapters: 66 },
  { file: 'Jer.xml',   name: 'jeremiah',      chapters: 52 },
  { file: 'Lam.xml',   name: 'lamentations',  chapters: 5  },
  { file: 'Ezek.xml',  name: 'ezekiel',       chapters: 48 },
  { file: 'Dan.xml',   name: 'daniel',        chapters: 12 },
  { file: 'Hos.xml',   name: 'hosea',         chapters: 14 },
  { file: 'Joel.xml',  name: 'joel',          chapters: 3  },
  { file: 'Amos.xml',  name: 'amos',          chapters: 9  },
  { file: 'Obad.xml',  name: 'obadiah',       chapters: 1  },
  { file: 'Jonah.xml', name: 'jonah',         chapters: 4  },
  { file: 'Mic.xml',   name: 'micah',         chapters: 7  },
  { file: 'Nah.xml',   name: 'nahum',         chapters: 3  },
  { file: 'Hab.xml',   name: 'habakkuk',      chapters: 3  },
  { file: 'Zeph.xml',  name: 'zephaniah',     chapters: 3  },
  { file: 'Hag.xml',   name: 'haggai',        chapters: 2  },
  { file: 'Zech.xml',  name: 'zechariah',     chapters: 14 },
  { file: 'Mal.xml',   name: 'malachi',       chapters: 4  },
];

// ── load TAHOT glosses ────────────────────────────────────────────────────────

console.log('Loading TAHOT files...');

const TAHOT_FILES = [
  'scripts/resources/TAHOT/TAHOT-Gen-Deu.txt',
  'scripts/resources/TAHOT/TAHOT-Jos-Est.txt',
  'scripts/resources/TAHOT/TAHOT-Job-Sng.txt',
  'scripts/resources/TAHOT/TAHOT-Isa-Mal.txt',
];

const tahotGloss = {};
const tahotSbl   = {};

for (const file of TAHOT_FILES) {
  let content;
  try {
    content = stripBom(readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`Could not read ${file}, skipping.`);
    continue;
  }

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (!trimmed.match(/^[A-Z1-9]/)) continue;

    const cols = trimmed.split('\t');
    if (cols.length < 4) continue;

    // col 0: Gen.1.1#01=L
    // col 1: Hebrew text
    // col 2: transliteration
    // col 3: English gloss
    const refRaw = cols[0].trim();
    const refMatch = refRaw.match(/^([A-Za-z0-9]+\.\d+\.\d+)(?:\([^)]+\))?(#\d+)/);
    if (!refMatch) continue;

    const ref = refMatch[1] + refMatch[2];

    // clean SBL
    const sbl = (cols[2] || '').trim()
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\//g, '')
      .replace(/\./g, '.')
      .trim();

    // clean gloss
    let gloss = (cols[3] || '').trim();
    gloss = gloss
      .replace(/<([^>]+)>/g, '[$1]')
      .replace(/\[obj\.\]/gi, '[obj]')
      .replace(/\//g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    tahotGloss[ref] = gloss;
    tahotSbl[ref]   = sbl;
  }
}

console.log(`TAHOT glosses loaded: ${Object.keys(tahotGloss).length}`);

// ── load words export ─────────────────────────────────────────────────────────

console.log('Loading words export...');
const wordsExportRaw  = readFileSync('scripts/words-export.json', 'utf8');
const wordsExportData = JSON.parse(wordsExportRaw);
const wordsExport     = {};

const rows = wordsExportData[0]?.results || wordsExportData.results || wordsExportData;
for (const row of rows) {
  if (row.word_hebrew) {
    wordsExport[row.word_hebrew] = row;
  }
}
console.log(`Words export loaded: ${Object.keys(wordsExport).length} entries`);

// ── OSHB osisID → TAHOT book code map ────────────────────────────────────────

const OSIS_TO_TAHOT = {
  'Gen': 'Gen', 'Exod': 'Exo', 'Lev': 'Lev', 'Num': 'Num', 'Deut': 'Deu',
  'Josh': 'Jos', 'Judg': 'Jdg', 'Ruth': 'Rut', '1Sam': '1Sa', '2Sam': '2Sa',
  '1Kgs': '1Ki', '2Kgs': '2Ki', '1Chr': '1Ch', '2Chr': '2Ch', 'Ezra': 'Ezr',
  'Neh': 'Neh', 'Esth': 'Est', 'Job': 'Job', 'Ps': 'Psa', 'Prov': 'Pro',
  'Eccl': 'Ecc', 'Song': 'Sng', 'Isa': 'Isa', 'Jer': 'Jer', 'Lam': 'Lam',
  'Ezek': 'Ezk', 'Dan': 'Dan', 'Hos': 'Hos', 'Joel': 'Jol', 'Amos': 'Amo',
  'Obad': 'Oba', 'Jonah': 'Jon', 'Mic': 'Mic', 'Nah': 'Nah', 'Hab': 'Hab',
  'Zeph': 'Zep', 'Hag': 'Hag', 'Zech': 'Zec', 'Mal': 'Mal',
};

// ── process books ─────────────────────────────────────────────────────────────

const outDir = 'src/data/verses';
mkdirSync(outDir, { recursive: true });

let stageIndex = 0;
let wordOrder  = 0;

const booksToProcess = BOOK_ORDER;

for (const book of booksToProcess) {
  console.log(`Processing ${book.name}...`);

  const xmlPath = `scripts/resources/wlc/${book.file}`;
  let xml;
  try {
    xml = stripBom(readFileSync(xmlPath, 'utf8'));
  } catch (e) {
    console.warn(`Could not read ${xmlPath}, skipping.`);
    stageIndex += book.chapters;
    continue;
  }

  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const firstVerse  = doc.getElementsByTagName('verse')[0];
  const firstOsisId = attr(firstVerse, 'osisID');
  const osisBook    = firstOsisId.split('.')[0];
  const tahotBook   = OSIS_TO_TAHOT[osisBook] || osisBook;

  const chapters = {};

  const verseNodes = doc.getElementsByTagName('verse');
  for (let v = 0; v < verseNodes.length; v++) {
    const verseNode = verseNodes[v];
    const osisID    = attr(verseNode, 'osisID');
    const parts     = osisID.split('.');
    const chapterNum = parseInt(parts[1]);
    const verseNum   = parseInt(parts[2]);

    if (!chapters[chapterNum]) chapters[chapterNum] = [];

    const wNodes = verseNode.getElementsByTagName('w');
    const words  = [];

    for (let w = 0; w < wNodes.length; w++) {
      const wNode         = wNodes[w];
      const hebrewText    = getText(wNode);
      const heb_consonant = stripNikud(hebrewText);
      if (!heb_consonant) continue;

      const wordNum    = w + 1;
      const wordNumStr = String(wordNum).padStart(2, '0');
      const tahotRef   = `${tahotBook}.${chapterNum}.${verseNum}#${wordNumStr}`;

      // ── gloss ──────────────────────────────────────────────────────────────
      let gloss = tahotGloss[tahotRef] || '';

      if (!gloss) {
        const wordData = wordsExport[heb_consonant];
        if (wordData) {
          const fallbackParts = [
            wordData.word_prefix_gloss?.split(',')[0],
            wordData.word_lemma_gloss?.split(',')[0],
            wordData.word_suffix_gloss?.split(',')[0],
          ].filter(Boolean);
          gloss = fallbackParts.join(' ');
        }
      }

      // flip trailing possessive pronoun to natural English order (covers both TAHOT and fallback sources)
      gloss = flipPossessive(gloss);

      // verb gender marker
      const verbMorph = attr(wNodes[w], 'morph') || '';
      if (verbMorph.match(/^H[cC]?\/?(V)|^HV/) && !verbMorph.match(/^HAc|^HAa|^HAo/)) {
        gloss = gloss
          .replace(/\b(he|she|they|it)\s+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (verbMorph.match(/3ms|w3ms|qw3ms/)) gloss += '(m)';
        else if (verbMorph.match(/3fs|w3fs|qw3fs/)) gloss += '(f)';
        else if (verbMorph.match(/3mp|w3mp|qw3mp/)) gloss += '(m)';
        else if (verbMorph.match(/3fp|w3fp|qw3fp/)) gloss += '(f)';
      }

      // ── SBL ────────────────────────────────────────────────────────────────
      let sbl = tahotSbl[tahotRef] || '';
      if (!sbl) {
        const wordData = wordsExport[heb_consonant];
        sbl = wordData?.word_hebrew_sbl || '';
      }

      // ── build word entry ───────────────────────────────────────────────────
      wordOrder++;
      words.push({
        word_order: wordOrder,
        heb_consonant,
        heb_nikud:  hebrewText,
        sbl,
        gloss,
      });
    }

    chapters[chapterNum].push({
      verse: verseNum,
      words,
    });
  }

  // write one JSON file per chapter
  for (let c = 1; c <= book.chapters; c++) {
    stageIndex++;
    const verses = chapters[c] || [];
    if (verses.length === 0) continue;

    const output = {
      book:        book.name,
      chapter:     c,
      stage_index: stageIndex,
      verses,
    };

    const filename = `${outDir}/${book.name}-${c}.json`;
    writeFileSync(filename, JSON.stringify(output, null, 2), 'utf8');
    console.log(`  Written: ${book.name}-${c}.json (${verses.length} verses)`);
  }
}

console.log('Done.');
