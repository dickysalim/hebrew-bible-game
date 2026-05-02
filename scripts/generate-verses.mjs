import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { DOMParser } from '@xmldom/xmldom';

// ── helpers ───────────────────────────────────────────────────────────────────

function stripNikud(str) {
  if (!str) return '';
  return str.replace(/[\u0591-\u05C7]/g, '').replace(/\//g, '');
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
  'scripts/TAHOT/TAHOT-Gen-Deu.txt',
  'scripts/TAHOT/TAHOT-Jos-Est.txt',
  'scripts/TAHOT/TAHOT-Job-Sng.txt',
  'scripts/TAHOT/TAHOT-Isa-Mal.txt',
];

const tahotGloss = {};
const tahotSbl = {};

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

    // skip empty lines, comment lines, header lines
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
    const refMatch = refRaw.match(/^([A-Za-z0-9]+\.\d+\.\d+#\d+)/);
    if (!refMatch) continue;

    const ref = refMatch[1];

    // clean SBL — just remove slashes, no markdown in data rows
    const sbl = (cols[2] || '').trim()
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // strip [text](url) markdown
      .replace(/\//g, '')                          // remove slashes
      .replace(/\./g, '.')                         // normalize dots
      .trim();

    // clean gloss
    let gloss = (cols[3] || '').trim();
    gloss = gloss
      .replace(/<([^>]+)>/g, '[$1]')       // <obj.> → [obj.]
      .replace(/\[obj\.\]/gi, '[obj]')      // normalize obj
      .replace(/\//g, ' ')                  // in/beginning → in beginning
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    tahotGloss[ref] = gloss;
    tahotSbl[ref] = sbl;
  }
}

console.log(`TAHOT glosses loaded: ${Object.keys(tahotGloss).length}`);

// ── load words export ─────────────────────────────────────────────────────────

console.log('Loading words export...');
const wordsExportRaw = readFileSync('scripts/words-export.json', 'utf8');
const wordsExportData = JSON.parse(wordsExportRaw);
const wordsExport = {};

const rows = wordsExportData[0]?.results || wordsExportData.results || wordsExportData;
for (const row of rows) {
  if (row.word_hebrew) {
    wordsExport[row.word_hebrew] = row;
  }
}
console.log(`Words export loaded: ${Object.keys(wordsExport).length} entries`);

// ── TAHOT book code → OSHB osisID map ────────────────────────────────────────

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

// process only genesis for now — remove filter for full Bible
const booksToProcess = BOOK_ORDER;

for (const book of booksToProcess) {
  console.log(`Processing ${book.name}...`);

  const xmlPath = `scripts/wlc/${book.file}`;
  let xml;
  try {
    xml = stripBom(readFileSync(xmlPath, 'utf8'));
  } catch (e) {
    console.warn(`Could not read ${xmlPath}, skipping.`);
    stageIndex += book.chapters;
    continue;
  }

  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  // get OSHB book code from first verse
  const firstVerse = doc.getElementsByTagName('verse')[0];
  const firstOsisId = attr(firstVerse, 'osisID');
  const osisBook = firstOsisId.split('.')[0];
  const tahotBook = OSIS_TO_TAHOT[osisBook] || osisBook;

  // group verses by chapter
  const chapters = {};

  const verseNodes = doc.getElementsByTagName('verse');
  for (let v = 0; v < verseNodes.length; v++) {
    const verseNode = verseNodes[v];
    const osisID = attr(verseNode, 'osisID');
    const parts = osisID.split('.');
    const chapterNum = parseInt(parts[1]);
    const verseNum = parseInt(parts[2]);

    if (!chapters[chapterNum]) chapters[chapterNum] = [];

    const wNodes = verseNode.getElementsByTagName('w');
    const words = [];

    for (let w = 0; w < wNodes.length; w++) {
      const wNode = wNodes[w];
      const hebrewText = getText(wNode);
      const wordId = stripNikud(hebrewText);
      if (!wordId) continue;

      const wordNum = w + 1;
      const wordNumStr = String(wordNum).padStart(2, '0');
      const tahotRef = `${tahotBook}.${chapterNum}.${verseNum}#${wordNumStr}`;

      // get gloss from TAHOT
      let gloss = tahotGloss[tahotRef] || '';

      // fallback — build from words export
      if (!gloss) {
        const wordData = wordsExport[wordId];
        if (wordData) {
          const parts = [
            wordData.word_prefix_gloss?.split(',')[0],
            wordData.word_lemma_gloss?.split(',')[0],
            wordData.word_suffix_gloss?.split(',')[0],
          ].filter(Boolean);
          gloss = parts.join(' ');
        }
      }

      // verb gender marker — 3rd person only
      const verbMorph = attr(wNodes[w], 'morph') || '';
      if (verbMorph.match(/^H[cC]?\/?(V)|^HV/) && !verbMorph.match(/^HAc|^HAa|^HAo/)) {
        // strip implied subject pronoun from start
        gloss = gloss
          .replace(/\b(he|she|they|it)\s+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        // add gender marker for 3rd person
        if (verbMorph.match(/3ms|w3ms|qw3ms/)) gloss += '(m)';
        else if (verbMorph.match(/3fs|w3fs|qw3fs/)) gloss += '(f)';
        else if (verbMorph.match(/3mp|w3mp|qw3mp/)) gloss += '(m)';
        else if (verbMorph.match(/3fp|w3fp|qw3fp/)) gloss += '(f)';
      }

      // get SBL from TAHOT
      let sbl = tahotSbl[tahotRef] || '';

      // fallback SBL from words export
      if (!sbl) {
        const wordData = wordsExport[wordId];
        sbl = wordData?.word_hebrew_sbl || '';
      }

      words.push({ id: wordId, sbl, gloss });
    }

    chapters[chapterNum].push({
      verse: verseNum,
      words,
      insights: [],
    });
  }

  // write one JSON file per chapter
  for (let c = 1; c <= book.chapters; c++) {
    stageIndex++;
    const verses = chapters[c] || [];
    if (verses.length === 0) continue;

    const output = {
      book: book.name,
      chapter: c,
      stage_index: stageIndex,
      verses,
    };

    const filename = `${outDir}/${book.name}-${c}.json`;
    writeFileSync(filename, JSON.stringify(output, null, 2), 'utf8');
    console.log(`  Written: ${book.name}-${c}.json (${verses.length} verses)`);
  }
}

console.log('Done.');