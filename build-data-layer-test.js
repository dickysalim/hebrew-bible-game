// build-data-layer.js
// Processes every chapter of the Hebrew Bible and builds the game's data layer.
// Usage:
//   node build-data-layer.js
//   node build-data-layer.js --start genesis-3

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { transliterate } from 'hebrew-transliteration';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Section 2 — Chapter manifest
// ---------------------------------------------------------------------------

const CHAPTERS = [
  { book: 'genesis', chapters: 3 },
];


// Expand into flat array of 929 { book, chapter, stageIndex } objects
let stageIndex = 1;
const ALL_CHAPTERS = [];
for (const { book, chapters } of CHAPTERS) {
  for (let c = 1; c <= chapters; c++) {
    ALL_CHAPTERS.push({ book, chapter: c, stageIndex: stageIndex++ });
  }
}

// ---------------------------------------------------------------------------
// Section 3 — OSHB book filename map
// ---------------------------------------------------------------------------

const OSHB_FILENAMES = {
  genesis:       'Gen.xml',
  exodus:        'Exod.xml',
  leviticus:     'Lev.xml',
  numbers:       'Num.xml',
  deuteronomy:   'Deut.xml',
  joshua:        'Josh.xml',
  judges:        'Judg.xml',
  ruth:          'Ruth.xml',
  '1samuel':     '1Sam.xml',
  '2samuel':     '2Sam.xml',
  '1kings':      '1Kgs.xml',
  '2kings':      '2Kgs.xml',
  '1chronicles': '1Chr.xml',
  '2chronicles': '2Chr.xml',
  ezra:          'Ezra.xml',
  nehemiah:      'Neh.xml',
  esther:        'Esth.xml',
  job:           'Job.xml',
  psalms:        'Ps.xml',
  proverbs:      'Prov.xml',
  ecclesiastes:  'Eccl.xml',
  songofsongs:   'Song.xml',
  isaiah:        'Isa.xml',
  jeremiah:      'Jer.xml',
  lamentations:  'Lam.xml',
  ezekiel:       'Ezek.xml',
  daniel:        'Dan.xml',
  hosea:         'Hos.xml',
  joel:          'Joel.xml',
  amos:          'Amos.xml',
  obadiah:       'Obad.xml',
  jonah:         'Jonah.xml',
  micah:         'Mic.xml',
  nahum:         'Nah.xml',
  habakkuk:      'Hab.xml',
  zephaniah:     'Zeph.xml',
  haggai:        'Hag.xml',
  zechariah:     'Zech.xml',
  malachi:       'Mal.xml',
};

// WEB book number map (Genesis=1 … Malachi=39)
const BOOK_NUMBERS = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, '1samuel': 9, '2samuel': 10,
  '1kings': 11, '2kings': 12, '1chronicles': 13, '2chronicles': 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19,
  proverbs: 20, ecclesiastes: 21, songofsongs: 22, isaiah: 23,
  jeremiah: 24, lamentations: 25, ezekiel: 26, daniel: 27,
  hosea: 28, joel: 29, amos: 30, obadiah: 31, jonah: 32,
  micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
};

// ---------------------------------------------------------------------------
// Section 4 — Directory setup
// ---------------------------------------------------------------------------

const DIRS = ['./cache', './cache/oshb', './src/data/verses'];
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Section 5 — Caching helper
// ---------------------------------------------------------------------------

async function fetchWithCache(url, cachePath) {
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await axios.get(url);
      const content = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
      fs.writeFileSync(cachePath, content, 'utf8');
      console.log(`  Downloaded and cached: ${cachePath}`);
      return content;
    } catch (err) {
      attempts++;
      console.log(`  Download failed (attempt ${attempts}): ${url}`);
      if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(`Failed to download after 3 attempts: ${url}`);
}

async function getOSHB(book) {
  const filename = OSHB_FILENAMES[book];
  if (!filename) throw new Error(`Unknown book: ${book}`);
  const cachePath = `./cache/oshb/${filename}`;
  const url = `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${filename}`;
  return fetchWithCache(url, cachePath);
}

async function getWEB() {
  const cachePath = './cache/web.json';
  // New scrollmapper repo structure: formats/json/<Translation>.json
  // Using KJV as the English translation source (public domain, OT complete)
  const url = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json';
  const content = await fetchWithCache(url, cachePath);
  return JSON.parse(content);
}

// ---------------------------------------------------------------------------
// Section 6 — Hebrew text processing
// ---------------------------------------------------------------------------

function stripNikud(str) {
  return str
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u05F3\u05F4]/g, '')
    .trim();
}

function generateSBL(hebrewWithNikud) {
  try {
    // Strip OSHB morpheme-boundary slashes before transliterating
    const cleaned = hebrewWithNikud.replace(/\//g, '');
    return transliterate(cleaned)
      .replace(/\/+/g, '')   // remove any remaining slashes in output
      .trim();
  } catch {
    return stripNikud(hebrewWithNikud);
  }
}

function parseSegments(hebrewConsonants, morph) {
  const letters = hebrewConsonants.split('');
  if (!morph || letters.length === 0) {
    return [{ type: 'root', letters }];
  }

  const segments = [];
  const hasMorphPrefix = morph.startsWith('H');

  if (hasMorphPrefix && letters.length > 1) {
    segments.push({ type: 'prefix', letters: [letters[0]] });
    segments.push({ type: 'root',   letters: letters.slice(1) });
  } else {
    segments.push({ type: 'root', letters });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Section 7 — DeepSeek API helper
// ---------------------------------------------------------------------------

async function callDeepSeek(prompt, maxTokens = 400) {
  await new Promise(r => setTimeout(r, 300));
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_DATALAYER_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      attempts++;
      console.log(`  DeepSeek call failed (attempt ${attempts}): ${err.message}`);
      if (attempts < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('DeepSeek API failed after 3 attempts');
}

// ---------------------------------------------------------------------------
// Section 8 — Generate word explanation
// ---------------------------------------------------------------------------

async function generateWordExplanation(hebrewId, gloss, root, pos, segments) {
  const prompt = `You are writing a word explanation for a Hebrew Bible learning game.

Hebrew word (consonants only, no nikud): ${hebrewId}
Gloss: ${gloss}
Root: ${root}
Part of speech: ${pos}
Segments: ${JSON.stringify(segments)}

Write a 2-paragraph explanation in this exact style:

Paragraph 1: Concrete meaning. Start with "The root *X (sbl)* means Y in its most concrete sense." Give the BDB definition. Explain how this word is used in the Hebrew Bible with 1-2 specific examples.

Paragraph 2: Abstract extensions. Explain how many English words this single Hebrew root replaces and list them. End with "Strong's HXXXX documents N occurrences across the Hebrew Bible."

Rules:
- No nikud anywhere in your response
- Use SBL transliteration in italics using *asterisks* around Hebrew terms
- Be specific, not generic
- Return only the explanation text, no preamble, no other content`;

  return callDeepSeek(prompt, 400);
}

// ---------------------------------------------------------------------------
// Section 9 — Generate root explanation
// ---------------------------------------------------------------------------

async function generateRootExplanation(rootKey, sbl, gloss, bdb, strongs) {
  const prompt = `You are writing a root explanation for a Hebrew Bible learning game.

Root (consonants only, no nikud): ${rootKey}
SBL transliteration: ${sbl}
Gloss: ${gloss}
BDB definition: ${bdb}
Strong's number: ${strongs}

Write a 2-paragraph explanation in this exact style:

Paragraph 1: Start with "The root *X (sbl)* concretely means Y." Give the BDB definition in quotes. List 2-3 concrete uses in the Hebrew Bible.

Paragraph 2: Abstract extensions of the root. List how many English words this root replaces and name them. End with "Strong's HXXXX documents N occurrences across the Hebrew Bible."

Rules:
- No nikud anywhere in your response
- Use SBL transliteration in italics using *asterisks* around Hebrew terms
- Return only the explanation text, no preamble, no other content`;

  return callDeepSeek(prompt, 400);
}

// ---------------------------------------------------------------------------
// Section 10 — Generate verse insight
// ---------------------------------------------------------------------------

async function generateInsight(verseHebrew, verseESV, verseNumber, book, chapter) {
  const prompt = `You are writing a single placeholder insight for a Hebrew Bible learning game.

Book: ${book}, Chapter: ${chapter}, Verse: ${verseNumber}
Hebrew words (consonants only, in order): ${verseHebrew}
English translation: ${verseESV}

Write exactly 1 insight that is invisible or lost in English translation.
Pick the most interesting from these categories:
- Root echo: a root here appeared earlier in the text, name both occurrences
- Wordplay: two words share a root or sound the author clearly intended
- Grammar surprise: something Hebrew grammar does that English flattens
- Word that does too much: one Hebrew word needing 2-4 English words to translate
- What is absent: something English implies that Hebrew does not actually say
- Number/structure: word count, chiasm, or repetition pattern in the verse

Format exactly as:
sbl-transliteration (Hebrew consonants only) — gloss — observation in 1-2 sentences.

Rules:
- No nikud in any Hebrew shown
- Be specific to this verse, not generic
- Return a JSON array containing exactly 1 string. No other text, no markdown, no preamble.`;

  const raw = await callDeepSeek(prompt, 150);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    // Try to extract the array from potentially messy output
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }
    // If the raw text itself looks like ["..."], extract the inner string
    const strArrayMatch = raw.trim().match(/^\["([\s\S]+)"\]$/);
    if (strArrayMatch) return [strArrayMatch[1].replace(/\\"/g, '"').trim()];
    // Final fallback: clean markdown fences and wrap
    return [raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()];
  }
}

// ---------------------------------------------------------------------------
// Section 11 — Parse OSHB XML for a chapter
// ---------------------------------------------------------------------------

async function parseChapter(book, chapterNum) {
  const xmlContent = await getOSHB(book);
  const parsed = await parseStringPromise(xmlContent);

  // Navigate OSHB XML structure: osis > osisText > div (book) > chapter > verse > w
  const osisText = parsed.osis.osisText[0];
  const bookDiv = osisText.div[0];
  const chapters = bookDiv.chapter;

  if (!chapters) throw new Error(`No chapters found in ${book}`);

  const targetChapter = chapters.find(ch => {
    const osisID = ch.$ && ch.$.osisID;
    return osisID && osisID.endsWith(`.${chapterNum}`);
  });

  if (!targetChapter) throw new Error(`Chapter ${chapterNum} not found in ${book}`);

  const verses = [];
  for (const verse of (targetChapter.verse || [])) {
    const verseID = verse.$ && verse.$.osisID;
    if (!verseID) continue;
    const verseNum = parseInt(verseID.split('.').pop(), 10);
    const words = [];

    for (const w of (verse.w || [])) {
      const rawHebrew = typeof w === 'string' ? w : (w._ || '');
      const morph  = (w.$ && w.$.morph)  || '';
      const lemma  = (w.$ && w.$.lemma)  || '';

      if (!rawHebrew.trim()) continue;

      // Strip OSHB morpheme-boundary slashes (e.g. "וְ/הַ/נָּחָשׁ" → "וְהַנָּחָשׁ")
      const cleanHebrew = rawHebrew.replace(/\//g, '');
      const sbl     = generateSBL(cleanHebrew);
      const id      = stripNikud(cleanHebrew);
      // Strip Strong's prefix from lemma to get the root consonants
      const rootKey = stripNikud(lemma.replace(/strong:H\d+\//gi, '').replace(/strong:H\d+/gi, ''));
      const segments = parseSegments(id, morph);

      words.push({ id, sbl, rawHebrew, morph, lemma: rootKey, segments });
    }

    if (words.length > 0) {
      verses.push({ verseNum, words });
    }
  }

  return verses;
}

// ---------------------------------------------------------------------------
// Section 12 — Get WEB verse text
// ---------------------------------------------------------------------------

function getWEBVerse(webData, book, chapter, verse) {
  // New scrollmapper format: { translation, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
  const bookNum = BOOK_NUMBERS[book];
  if (!bookNum) return '';
  // books array is 0-indexed; book_id 1 = index 0
  const bookEntry = webData.books[bookNum - 1];
  if (!bookEntry) return '';
  const chapterEntry = bookEntry.chapters.find(ch => ch.chapter === chapter);
  if (!chapterEntry) return '';
  const verseEntry = chapterEntry.verses.find(v => v.verse === verse);
  return verseEntry ? verseEntry.text : '';
}

// ---------------------------------------------------------------------------
// Section 13 — Generate ESV word-level segment mapping
// ---------------------------------------------------------------------------

async function generateESVSegments(words, englishText) {
  if (!englishText || words.length === 0) return [{ t: englishText || '', w: null }];

  const wordList = words.map((w, i) => `${i}: ${w.id} (${w.sbl})`).join('\n');

  const prompt = `You are building a Hebrew Bible study app. Segment an English verse translation and map each segment to its Hebrew source word.

Hebrew words for this verse (0-indexed):
${wordList}

English translation:
"${englishText}"

Return ONLY a valid JSON array of segment objects with exactly these fields:
- "t": the English text segment (string)
- "w": the 0-based index of the corresponding Hebrew word, or null for connecting words/articles/punctuation not mapped to a single Hebrew word

Rules:
- The concatenation of ALL "t" values must equal the exact English text above, character for character
- Keep segments short (1–5 words each)
- Punctuation (commas, periods) should be their own segment with w: null
- Each Hebrew word index should be used at most once (unless the word is genuinely repeated)
- Return ONLY the JSON array. No other text. No markdown. No explanation.

Example format:
[{"t":"In the beginning","w":0},{"t":", ","w":null},{"t":"God","w":2},{"t":" created","w":1},{"t":".","w":null}]`;

  const raw = await callDeepSeek(prompt, 600);
  try {
    const parsed = JSON.parse(raw);
    // Validate: concatenation must equal original text
    const reconstructed = parsed.map(s => s.t).join('');
    if (reconstructed === englishText) return parsed;
    // If mismatch, fall back to single segment
    console.log('  ESV segment mismatch — using fallback');
    return [{ t: englishText, w: null }];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    return [{ t: englishText, w: null }];
  }
}

// ---------------------------------------------------------------------------
// Section 13 — Main processing loop
// ---------------------------------------------------------------------------

async function main() {
  // Parse --start argument (supports both --start genesis-3 and --start=genesis-3)
  const args = process.argv.slice(2);
  let startFrom = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      startFrom = args[i + 1];
      break;
    }
    if (args[i].startsWith('--start=')) {
      startFrom = args[i].split('=')[1];
      break;
    }
  }

  if (startFrom) {
    console.log(`Resuming from: ${startFrom}`);
  }

  // Load existing words and roots into memory
  const wordsPath = './src/data/words.json';
  const rootsPath = './src/data/roots.json';

  if (!fs.existsSync(wordsPath)) {
    throw new Error(`words.json not found at ${wordsPath} — run from project root`);
  }
  if (!fs.existsSync(rootsPath)) {
    throw new Error(`roots.json not found at ${rootsPath} — run from project root`);
  }

  const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
  const rootsData = JSON.parse(fs.readFileSync(rootsPath, 'utf8'));

  // Load WEB bible once
  console.log('Loading WEB English Bible...');
  const webData = await getWEB();
  console.log(`WEB loaded: ${webData.books ? webData.books.length : 0} books`);

  let skipping = !!startFrom;

  for (const { book, chapter, stageIndex } of ALL_CHAPTERS) {
    const chapterKey = `${book}-${chapter}`;

    // Handle --start resume
    if (skipping) {
      if (chapterKey === startFrom) {
        skipping = false;
      } else {
        console.log(`SKIP ${chapterKey} (before start)`);
        continue;
      }
    }

    // Skip genesis-1 and genesis-2 — already complete
    if (book === 'genesis' && (chapter === 1 || chapter === 2)) {
      console.log(`SKIP ${chapterKey} — already complete`);
      continue;
    }

    // Skip if output file already exists (resumable)
    const outputPath = `./src/data/verses/${chapterKey}.json`;
    if (fs.existsSync(outputPath)) {
      console.log(`SKIP ${chapterKey} — already exists`);
      continue;
    }

    console.log(`\nProcessing ${chapterKey} (stage ${stageIndex})...`);

    try {
      const verses = await parseChapter(book, chapter);
      let newWordsCount = 0;
      let newRootsCount = 0;
      const newWordsList = [];
      const newRootsList = [];
      const builtVerses = [];

      for (const { verseNum, words } of verses) {
        const englishText = getWEBVerse(webData, book, chapter, verseNum);
        const verseHebrewList = words.map(w => w.id).join(' ');
        const esv = await generateESVSegments(words, englishText);

        // Generate insight for this verse
        const insights = await generateInsight(
          verseHebrewList, englishText, verseNum, book, chapter
        );

        // Process each word
        const builtWords = [];
        for (const { id, sbl, lemma, segments, morph } of words) {
          // Add to words.json if new — never overwrite existing entries
          if (id && !wordsData.words[id]) {
            const pos = morph.includes('N') ? 'noun'
              : morph.includes('V') ? 'verb'
              : morph.includes('A') ? 'adjective'
              : morph.includes('P') ? 'preposition'
              : 'particle';

            const explanation = await generateWordExplanation(id, '', lemma, pos, segments);

            wordsData.words[id] = {
              gloss: '',
              root: lemma,
              pos,
              prefix_sbl: null,
              prefix_gloss: null,
              root_sbl: sbl,
              root_gloss: '',
              suffix_sbl: null,
              suffix_gloss: null,
              segments,
              explanation,
              word_sbl: sbl,
            };

            newWordsCount++;
            newWordsList.push(id);
          }

          // Add root to roots.json if new — never overwrite existing entries
          if (lemma && !rootsData.roots[lemma]) {
            const rootExplanation = await generateRootExplanation(lemma, sbl, '', '', '');

            rootsData.roots[lemma] = {
              sbl,
              gloss: '',
              bdb: '',
              strongs: '',
              explanation: rootExplanation,
            };

            newRootsCount++;
            newRootsList.push(lemma);
          }

          builtWords.push({ id, sbl });
        }

        builtVerses.push({
          verse: verseNum,
          esv,
          insights,
          words: builtWords,
        });

        process.stdout.write(`  verse ${verseNum} done\r`);
      }

      // Build chapter file
      const chapterJSON = {
        book,
        chapter,
        stage_index: stageIndex,
        verses: builtVerses,
      };

      // Write chapter file
      fs.writeFileSync(outputPath, JSON.stringify(chapterJSON, null, 2), 'utf8');

      // Write updated words and roots after every chapter (not just at the end)
      fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 2), 'utf8');
      fs.writeFileSync(rootsPath, JSON.stringify(rootsData, null, 2), 'utf8');

      // Log progress
      const logLine = `${chapterKey} | ${builtVerses.length} verses | ${newWordsCount} new words | ${newRootsCount} new roots | words total: ${Object.keys(wordsData.words).length} | roots total: ${Object.keys(rootsData.roots).length} | DONE\n`;
      fs.appendFileSync('./src/data/verses/progress.log', logLine, 'utf8');
      console.log(`\n✓ ${logLine.trim()}`);

      if (newWordsList.length > 0) console.log(`  New words: ${newWordsList.join(', ')}`);
      if (newRootsList.length > 0) console.log(`  New roots: ${newRootsList.join(', ')}`);

    } catch (err) {
      const errorLine = `${chapterKey} | ERROR: ${err.message}\n`;
      fs.appendFileSync('./src/data/verses/progress.log', errorLine, 'utf8');
      console.error(`✗ ${errorLine.trim()}`);
    }
  }

  console.log('\n=== Hebrew Bible Data Layer Complete ===');
  console.log(`Total unique words: ${Object.keys(wordsData.words).length}`);
  console.log(`Total unique roots: ${Object.keys(rootsData.roots).length}`);
  console.log('See ./src/data/verses/progress.log for full report');
}

main().catch(console.error);
