import { readFileSync, writeFileSync } from 'fs';
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

// ── load LexicalIndex ─────────────────────────────────────────────────────────
// Two jobs:
//   1. Map each entry id → Strong's number
//   2. Map each Strong's number → its root Strong's number

console.log('Reading LexicalIndex.xml...');
const indexXml = stripBom(readFileSync('./scripts/LexicalIndex.xml', 'utf8'));
const indexDoc = new DOMParser().parseFromString(indexXml, 'text/xml');
const indexEntries = indexDoc.getElementsByTagName('entry');

// id → strongs
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

// strongs → root strongs
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

// also build bdbId → strongs map for BDB matching
const bdbToStrongs = {};
for (let i = 0; i < indexEntries.length; i++) {
  const entry = indexEntries[i];
  const xrefs = entry.getElementsByTagName('xref');
  for (let x = 0; x < xrefs.length; x++) {
    const xref = xrefs[x];
    const bdbId = attr(xref, 'bdb');
    const strongNum = attr(xref, 'strong');
    if (bdbId && strongNum) {
      const cleanBdb = bdbId.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      bdbToStrongs[cleanBdb] = 'H' + strongNum;
    }
  }
}

console.log(`LexicalIndex root mappings: ${Object.keys(strongsToRoot).length}`);

// ── load BrownDriverBriggs ────────────────────────────────────────────────────
// Every entry (not just type="root") because lemmas include nouns, verbs, etc.

console.log('Reading BrownDriverBriggs.xml...');
const bdbXml = stripBom(readFileSync('./scripts/BrownDriverBriggs.xml', 'utf8'));
const bdbDoc = new DOMParser().parseFromString(bdbXml, 'text/xml');
const bdbEntries = bdbDoc.getElementsByTagName('entry');

const bdbById = {};
for (let i = 0; i < bdbEntries.length; i++) {
  const entry = bdbEntries[i];
  const entryId = attr(entry, 'id');
  if (!entryId) continue;

  const cleanId = entryId.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const bdbText = getText(entry)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);

  bdbById[cleanId] = bdbText;
}

console.log(`BDB entries loaded: ${Object.keys(bdbById).length}`);

// ── load HebrewStrong ─────────────────────────────────────────────────────────
// Every H entry = one lemma row

console.log('Reading HebrewStrong.xml...');
const strongXml = stripBom(readFileSync('./scripts/HebrewStrong.xml', 'utf8'));
const strongDoc = new DOMParser().parseFromString(strongXml, 'text/xml');
const strongEntries = strongDoc.getElementsByTagName('entry');

const lemmaMap = {};

for (let i = 0; i < strongEntries.length; i++) {
  const entry = strongEntries[i];
  const id = attr(entry, 'id');
  if (!id.startsWith('H')) continue;

  const wNode = entry.getElementsByTagName('w')[0];
  if (!wNode) continue;

  // skip proper nouns
  const pos = attr(wNode, 'pos');
  const lang = attr(wNode, 'xml:lang') || 'heb';
  if (lang === 'x-pn' || pos.includes('n-pr')) continue;

  const lemmaWord = stripNikud(getText(wNode));
  const lemmaSbl  = attr(wNode, 'xlit');

  // gloss from meaning/def tags
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

  // root strongs from LexicalIndex
  const rootStrongs = strongsToRoot[id] || null;

  lemmaMap[id] = {
    lemma_strongs:      id,
    lemma_lang:         lang === 'heb' ? 'heb' : 'arc',
    lemma_word:         lemmaWord,
    lemma_sbl:          lemmaSbl,
    lemma_gloss:        gloss,
    lemma_bdb:          '',        // filled below
    lemma_root_strongs: rootStrongs,
    lemma_explanation:  '',        // AI-generated later
  };
}

console.log(`Lemma entries built: ${Object.keys(lemmaMap).length}`);

// ── match BDB definitions ─────────────────────────────────────────────────────

console.log('Matching BDB definitions...');
let bdbMatchCount = 0;

for (const [bdbId, strongsId] of Object.entries(bdbToStrongs)) {
  if (lemmaMap[strongsId] && bdbById[bdbId]) {
    lemmaMap[strongsId].lemma_bdb = bdbById[bdbId];
    bdbMatchCount++;
  }
}

console.log(`BDB matches: ${bdbMatchCount} of ${Object.keys(lemmaMap).length}`);

// ── build SQL ─────────────────────────────────────────────────────────────────

console.log('Building SQL...');
const lines = [];
lines.push('-- Auto-generated by import-lemma.mjs');
lines.push('-- Lemma table from HebrewStrong.xml + BrownDriverBriggs.xml + LexicalIndex.xml');
lines.push('');

for (const row of Object.values(lemmaMap)) {
  lines.push(
    `INSERT OR IGNORE INTO lemma ` +
    `(lemma_strongs, lemma_lang, lemma_word, lemma_sbl, lemma_gloss, lemma_bdb, lemma_root_strongs, lemma_explanation) VALUES (` +
    `'${escapeSql(row.lemma_strongs)}', ` +
    `'${escapeSql(row.lemma_lang)}', ` +
    `'${escapeSql(row.lemma_word)}', ` +
    `'${escapeSql(row.lemma_sbl)}', ` +
    `'${escapeSql(row.lemma_gloss)}', ` +
    `'${escapeSql(row.lemma_bdb)}', ` +
    `${row.lemma_root_strongs ? `'${escapeSql(row.lemma_root_strongs)}'` : 'NULL'}, ` +
    `''` +
    `);`
  );
}

writeFileSync('./scripts/lemma-import.sql', lines.join('\n'), 'utf8');
console.log(`Done. ${Object.keys(lemmaMap).length} lemmas written to scripts/lemma-import.sql`);
