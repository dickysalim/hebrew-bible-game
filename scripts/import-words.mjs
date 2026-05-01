import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { DOMParser } from '@xmldom/xmldom';

// ── helpers ───────────────────────────────────────────────────────────────────

function stripNikud(str) {
  if (!str) return '';
  return str.replace(/[\u0591-\u05C7]/g, '').replace(/\//g, '');
}

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
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

// ── prefix lookup ─────────────────────────────────────────────────────────────

const prefixLookup = {
  'b': { hebrew: 'ב', sbl: 'b', pron: 'b', gloss: 'in, with, by' },
  'c': { hebrew: 'ו', sbl: 'w', pron: 'w', gloss: 'and' },
  'd': { hebrew: 'ה', sbl: 'h', pron: 'h', gloss: 'the' },
  'l': { hebrew: 'ל', sbl: 'l', pron: 'l', gloss: 'to, for' },
  'm': { hebrew: 'מ', sbl: 'm', pron: 'm', gloss: 'from' },
  'k': { hebrew: 'כ', sbl: 'k', pron: 'k', gloss: 'like, as' },
  'v': { hebrew: 'ו', sbl: 'w', pron: 'w', gloss: 'and (consecutive)' },
  'i': { hebrew: 'י', sbl: 'y', pron: 'y', gloss: 'and (consecutive imperfect)' },
  's': { hebrew: 'ש', sbl: 'sh', pron: 'sh', gloss: 'who, which, that' },
};

function resolvePrefixes(prefixCodes) {
  if (!prefixCodes || prefixCodes.length === 0) {
    return { hebrew: '', sbl: '', pron: '', gloss: '' };
  }
  const h = [], s = [], p = [], g = [];
  for (const code of prefixCodes) {
    const lookup = prefixLookup[code.toLowerCase()];
    if (lookup) {
      h.push(lookup.hebrew);
      s.push(lookup.sbl);
      p.push(lookup.pron);
      g.push(lookup.gloss);
    }
  }
  return {
    hebrew: h.join(''),
    sbl: s.join(''),
    pron: p.join(''),
    gloss: g.join(', '),
  };
}

// ── suffix lookup ─────────────────────────────────────────────────────────────

const suffixLookup = {
  'Sp1cs': { hebrew: 'י', sbl: 'î', pron: 'ee', gloss: 'my, me' },
  'Sp1cp': { hebrew: 'נו', sbl: 'nû', pron: 'nu', gloss: 'our, us' },
  'Sp2ms': { hebrew: 'ך', sbl: 'kā', pron: 'kha', gloss: 'your (ms)' },
  'Sp2mp': { hebrew: 'כם', sbl: 'kem', pron: 'khem', gloss: 'your (mp)' },
  'Sp2fs': { hebrew: 'ך', sbl: 'k', pron: 'kh', gloss: 'your (fs)' },
  'Sp2fp': { hebrew: 'כן', sbl: 'ken', pron: 'khen', gloss: 'your (fp)' },
  'Sp3ms': { hebrew: 'ו', sbl: 'w', pron: 'o', gloss: 'his, him' },
  'Sp3fs': { hebrew: 'ה', sbl: 'h', pron: 'ah', gloss: 'her' },
  'Sp3mp': { hebrew: 'ם', sbl: 'm', pron: 'am', gloss: 'their, them (mp)' },
  'Sp3fp': { hebrew: 'ן', sbl: 'n', pron: 'an', gloss: 'their, them (fp)' },
  'Sd':    { hebrew: 'ה', sbl: 'h', pron: 'ah', gloss: 'toward, to (directional)' },
  'Sh':    { hebrew: 'ה', sbl: 'h', pron: 'ah', gloss: '(paragogic he)' },
  'Sn':    { hebrew: 'ן', sbl: 'n', pron: 'n', gloss: '(paragogic nun)' },
};

function resolveSuffix(morphCode) {
  if (!morphCode) return { hebrew: '', sbl: '', pron: '', gloss: '' };
  const match = morphCode.match(/\/(S[a-z0-9]+)$/);
  if (!match) return { hebrew: '', sbl: '', pron: '', gloss: '' };
  const suffixCode = match[1];
  const lookup = suffixLookup[suffixCode];
  if (!lookup) return { hebrew: '', sbl: '', pron: '', gloss: '' };
  return lookup;
}

// ── parse morph pos ───────────────────────────────────────────────────────────

function parsePOS(morph) {
  if (!morph) return '';

  const parts = morph.replace(/^[HA]/, '').split('/');

  for (const part of parts) {
    // skip single lowercase letters — lemma prefix codes (b, c, d, l, m etc)
    if (/^[a-z]$/.test(part)) continue;
    // skip suffix codes — start with S followed by lowercase
    if (/^S[a-z]/.test(part)) continue;
    // skip single uppercase letters — morph prefix type codes (R, C, T, D)
    if (/^[A-Z]$/.test(part)) continue;
    // skip article prefix Td
    if (part === 'Td') continue;

    const first = part[0];
    const posMap = {
      'V': 'verb',
      'N': 'noun',
      'A': 'adjective',
      'R': 'preposition',
      'C': 'conjunction',
      'T': 'particle',
      'P': 'pronoun',
      'D': 'adverb',
    };
    return posMap[first] || first;
  }
  return '';
}

// ── parse lemma ───────────────────────────────────────────────────────────────

function parseLemma(lemma) {
  if (!lemma) return null;
  const parts = lemma.trim().split('/');
  const corePart = parts[parts.length - 1];
  const prefixCodes = parts.slice(0, -1);
  const strongsMatch = corePart.trim().match(/^(\d+)/);
  if (!strongsMatch) return null;
  const strongsNum = 'H' + strongsMatch[1];
  return { strongsNum, prefixCodes };
}

function parseLang(morph) {
  if (!morph) return 'heb';
  if (morph.startsWith('A')) return 'arc';
  return 'heb';
}

// ── load LexicalIndex ─────────────────────────────────────────────────────────

console.log('Reading LexicalIndex.xml...');
const indexXml = stripBom(readFileSync('./scripts/LexicalIndex.xml', 'utf8'));
const indexDoc = new DOMParser().parseFromString(indexXml, 'text/xml');
const indexEntries = indexDoc.getElementsByTagName('entry');

const idToStrongs = {};
for (let i = 0; i < indexEntries.length; i++) {
  const entry = indexEntries[i];
  const id = attr(entry, 'id');
  const xrefs = entry.getElementsByTagName('xref');
  for (let x = 0; x < xrefs.length; x++) {
    const strongNum = attr(xrefs[x], 'strong');
    if (strongNum) {
      idToStrongs[id] = 'H' + strongNum;
      break;
    }
  }
}

const strongsToRoot = {};
for (let i = 0; i < indexEntries.length; i++) {
  const entry = indexEntries[i];
  const id = attr(entry, 'id');
  const myStrongs = idToStrongs[id];
  if (!myStrongs) continue;

  const etymNodes = entry.getElementsByTagName('etym');
  for (let e = 0; e < etymNodes.length; e++) {
    const etym = etymNodes[e];
    const type = attr(etym, 'type');
    if (type === 'main') {
      strongsToRoot[myStrongs] = myStrongs;
    } else if (type === 'sub') {
      const parentId = getText(etym).trim().split(/[\s,]/)[0];
      const parentStrongs = idToStrongs[parentId];
      if (parentStrongs) {
        strongsToRoot[myStrongs] = parentStrongs;
      }
    }
  }
}

console.log(`LexicalIndex root mappings: ${Object.keys(strongsToRoot).length}`);

// ── load Strong's data ────────────────────────────────────────────────────────

console.log('Reading HebrewStrong.xml...');
const strongXml = stripBom(readFileSync('./scripts/HebrewStrong.xml', 'utf8'));
const strongDoc = new DOMParser().parseFromString(strongXml, 'text/xml');
const strongEntries = strongDoc.getElementsByTagName('entry');

const strongMap = {};

for (let i = 0; i < strongEntries.length; i++) {
  const entry = strongEntries[i];
  const id = attr(entry, 'id');
  if (!id.startsWith('H')) continue;

  const wNode = entry.getElementsByTagName('w')[0];
  if (!wNode) continue;

  const sbl = attr(wNode, 'xlit');
  const pron = attr(wNode, 'pron');
  const pos = attr(wNode, 'pos');
  const lang = attr(wNode, 'xml:lang') || 'heb';
  const hebrewLemma = stripNikud(getText(wNode));

  const meaningNode = entry.getElementsByTagName('meaning')[0];
  let gloss = '';
  if (meaningNode) {
    const defs = meaningNode.getElementsByTagName('def');
    const defTexts = [];
    for (let d = 0; d < defs.length; d++) {
      defTexts.push(getText(defs[d]));
    }
    gloss = defTexts.join(', ');
  }
  if (!gloss) {
    const usageNode = entry.getElementsByTagName('usage')[0];
    if (usageNode) gloss = getText(usageNode).split(',')[0].trim();
  }

  const sourceNode = entry.getElementsByTagName('source')[0];
  const sourceText = getText(sourceNode).toLowerCase();
  const isRoot = sourceText.includes('primitive root') ||
                 sourceText.includes('primitive word') ? 1 : 0;

  strongMap[id] = { gloss, pron, sbl, pos, lang, isRoot, hebrewLemma };
}

console.log(`Strong's entries loaded: ${Object.keys(strongMap).length}`);

// ── process all wlc XML files ─────────────────────────────────────────────────

const wlcDir = './scripts/wlc';
const files = readdirSync(wlcDir)
  .filter(f => f.endsWith('.xml') && f !== 'VerseMap.xml')
  .sort();

console.log(`Processing ${files.length} Bible books...`);

const wordsMap = {};

for (const file of files) {
  const xml = stripBom(readFileSync(`${wlcDir}/${file}`, 'utf8'));
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const wNodes = doc.getElementsByTagName('w');

  for (let i = 0; i < wNodes.length; i++) {
    const w = wNodes[i];
    const lemma = attr(w, 'lemma');
    const morph = attr(w, 'morph');
    const hebrewText = getText(w);

    if (!lemma || !hebrewText) continue;

    const parsed = parseLemma(lemma);
    if (!parsed) continue;

    const { strongsNum, prefixCodes } = parsed;
    const wordKey = stripNikud(hebrewText);

    if (wordsMap[wordKey]) continue;

    const strongsData = strongMap[strongsNum] || {};
    const lang = parseLang(morph);
    const prefix = resolvePrefixes(prefixCodes);
    const suffix = resolveSuffix(morph);
    const rootStrongs = strongsToRoot[strongsNum] || strongsNum;
    const lemmaHebrew = strongsData.hebrewLemma || '';
    const pos = parsePOS(morph);
    const isRoot = (rootStrongs === strongsNum && strongsData.isRoot) ? 1 : 0;

    wordsMap[wordKey] = {
      word_hebrew: wordKey,
      word_lang: strongsData.lang || lang,
      word_morph: morph,
      word_gloss_literal: '',
      word_explanation: '',
      word_hebrew_sbl: strongsData.sbl || '',
      word_hebrew_pron: strongsData.pron || '',
      word_lemma: lemmaHebrew,
      word_lemma_sbl: strongsData.sbl || '',
      word_lemma_pron: strongsData.pron || '',
      word_lemma_gloss: strongsData.gloss || '',
      word_lemma_strongs: strongsNum,
      word_lemma_pos: pos,
      word_root_strongs: rootStrongs,
      word_is_root: isRoot,
      word_prefix: prefix.hebrew,
      word_prefix_sbl: prefix.sbl,
      word_prefix_pron: prefix.pron,
      word_prefix_gloss: prefix.gloss,
      word_suffix: suffix.hebrew,
      word_suffix_sbl: suffix.sbl,
      word_suffix_pron: suffix.pron,
      word_suffix_gloss: suffix.gloss,
    };
  }
}

console.log(`Unique word forms found: ${Object.keys(wordsMap).length}`);

// ── build SQL ─────────────────────────────────────────────────────────────────

console.log('Building SQL...');
const lines = [];
lines.push('-- Auto-generated by import-words.mjs');
lines.push('');

for (const row of Object.values(wordsMap)) {
  lines.push(
    `INSERT OR IGNORE INTO words ` +
    `(word_hebrew, word_lang, word_morph, word_gloss_literal, word_explanation, word_hebrew_sbl, word_hebrew_pron, word_lemma, word_lemma_sbl, word_lemma_pron, word_lemma_gloss, word_lemma_strongs, word_lemma_pos, word_root_strongs, word_is_root, word_prefix, word_prefix_sbl, word_prefix_pron, word_prefix_gloss, word_suffix, word_suffix_sbl, word_suffix_pron, word_suffix_gloss) VALUES (` +
    `'${escapeSql(row.word_hebrew)}', ` +
    `'${escapeSql(row.word_lang)}', ` +
    `'${escapeSql(row.word_morph)}', ` +
    `'${escapeSql(row.word_gloss_literal)}', ` +
    `'${escapeSql(row.word_explanation)}', ` +
    `'${escapeSql(row.word_hebrew_sbl)}', ` +
    `'${escapeSql(row.word_hebrew_pron)}', ` +
    `'${escapeSql(row.word_lemma)}', ` +
    `'${escapeSql(row.word_lemma_sbl)}', ` +
    `'${escapeSql(row.word_lemma_pron)}', ` +
    `'${escapeSql(row.word_lemma_gloss)}', ` +
    `'${escapeSql(row.word_lemma_strongs)}', ` +
    `'${escapeSql(row.word_lemma_pos)}', ` +
    `'${escapeSql(row.word_root_strongs)}', ` +
    `${row.word_is_root}, ` +
    `'${escapeSql(row.word_prefix)}', ` +
    `'${escapeSql(row.word_prefix_sbl)}', ` +
    `'${escapeSql(row.word_prefix_pron)}', ` +
    `'${escapeSql(row.word_prefix_gloss)}', ` +
    `'${escapeSql(row.word_suffix)}', ` +
    `'${escapeSql(row.word_suffix_sbl)}', ` +
    `'${escapeSql(row.word_suffix_pron)}', ` +
    `'${escapeSql(row.word_suffix_gloss)}'` +
    `);`
  );
}

writeFileSync('./scripts/words-import.sql', lines.join('\n'), 'utf8');
console.log(`Done. ${Object.values(wordsMap).length} word forms written to scripts/words-import.sql`);