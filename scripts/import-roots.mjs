import { readFileSync, writeFileSync } from 'fs';
import { DOMParser } from '@xmldom/xmldom';

// ── helpers ───────────────────────────────────────────────────────────────────

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

function attr(node, name) {
  if (!node || !node.getAttribute) return '';
  return node.getAttribute(name) || '';
}

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

function stripNikud(str) {
  if (!str) return '';
  return str.replace(/[\u0591-\u05C7]/g, '');
}

// ── parse LexicalIndex.xml ────────────────────────────────────────────────────
// build set of Strong's numbers that are etym type="main" — family heads

console.log('Reading LexicalIndex.xml...');
const indexXml = stripBom(readFileSync('./scripts/LexicalIndex.xml', 'utf8'));
const indexDoc = new DOMParser().parseFromString(indexXml, 'text/xml');
const indexEntries = indexDoc.getElementsByTagName('entry');

// id → strongs map
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

// set of Strong's numbers that are family heads (etym type="main")
const mainRootStrongs = new Set();
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
      mainRootStrongs.add(myStrongs);
    }
  }
}

console.log(`LexicalIndex main roots found: ${mainRootStrongs.size}`);

// ── parse BrownDriverBriggs.xml ───────────────────────────────────────────────

console.log('Reading BrownDriverBriggs.xml...');
const bdbXml = stripBom(readFileSync('./scripts/BrownDriverBriggs.xml', 'utf8'));
const bdbDoc = new DOMParser().parseFromString(bdbXml, 'text/xml');
const bdbEntries = bdbDoc.getElementsByTagName('entry');

const bdbById = {};
for (let i = 0; i < bdbEntries.length; i++) {
  const entry = bdbEntries[i];
  const type = attr(entry, 'type');
  if (type !== 'root') continue;

  const entryId = attr(entry, 'id');
  if (!entryId) continue;

  const mod = attr(entry, 'mod');
  let homonym = null;
  if (mod === 'I') homonym = 1;
  else if (mod === 'II') homonym = 2;

  const bdbText = getText(entry)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);

  bdbById[entryId] = { homonym, bdbText };
}

// bdbId → strongs map from LexicalIndex
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

console.log(`BDB root entries found: ${Object.keys(bdbById).length}`);

// ── parse HebrewStrong.xml ────────────────────────────────────────────────────

console.log('Reading HebrewStrong.xml...');
const strongXml = stripBom(readFileSync('./scripts/HebrewStrong.xml', 'utf8'));
const strongDoc = new DOMParser().parseFromString(strongXml, 'text/xml');
const strongEntries = strongDoc.getElementsByTagName('entry');

const strongMap = {};
for (let i = 0; i < strongEntries.length; i++) {
  const entry = strongEntries[i];
  const id = attr(entry, 'id');
  if (!id.startsWith('H')) continue;

  // only include entries that are family heads in LexicalIndex
  if (!mainRootStrongs.has(id)) continue;

  const wNode = entry.getElementsByTagName('w')[0];
  if (!wNode) continue;

  const lang = attr(wNode, 'xml:lang');
  const pos = attr(wNode, 'pos');

  // exclude proper nouns
  if (lang === 'x-pn') continue;
  if (pos.includes('n-pr')) continue;

  const hebrew = stripNikud(getText(wNode));
  const sbl = attr(wNode, 'xlit');
  const pron = attr(wNode, 'pron');

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

  // check if it's a Strong's primitive root
  const sourceNode = entry.getElementsByTagName('source')[0];
  const sourceText = getText(sourceNode).toLowerCase();
  const isPrimitive = sourceText.includes('primitive root') ||
                      sourceText.includes('primitive word');

  strongMap[id] = {
    root_strongs: id,
    root_hebrew: hebrew,
    root_lang: lang || 'heb',
    root_sbl: sbl,
    root_pron: pron,
    root_pos: pos,
    root_gloss: gloss,
    isPrimitive,
  };
}

console.log(`Strong's roots found: ${Object.keys(strongMap).length}`);

// ── merge and build SQL ───────────────────────────────────────────────────────

console.log('Merging and building SQL...');

const rows = Object.values(strongMap);
const lines = [];
let bdbMatchCount = 0;

lines.push('-- Auto-generated by import-roots.mjs');
lines.push('-- Roots from HebrewStrong.xml + BrownDriverBriggs.xml + LexicalIndex.xml');
lines.push('');

for (const row of rows) {
  let bdb = '';
  let homonym = 'NULL';

  for (const [bdbId, strongsId] of Object.entries(bdbToStrongs)) {
    if (strongsId === row.root_strongs && bdbById[bdbId]) {
      const bdbEntry = bdbById[bdbId];
      bdb = bdbEntry.bdbText;
      if (bdbEntry.homonym !== null) homonym = bdbEntry.homonym;
      bdbMatchCount++;
      break;
    }
  }

  lines.push(
    `INSERT OR IGNORE INTO roots ` +
    `(root_strongs, root_hebrew, root_lang, root_sbl, root_pron, root_pos, root_gloss, root_bdb, root_homonym) VALUES (` +
    `'${escapeSql(row.root_strongs)}', ` +
    `'${escapeSql(row.root_hebrew)}', ` +
    `'${escapeSql(row.root_lang)}', ` +
    `'${escapeSql(row.root_sbl)}', ` +
    `'${escapeSql(row.root_pron)}', ` +
    `'${escapeSql(row.root_pos)}', ` +
    `'${escapeSql(row.root_gloss)}', ` +
    `'${escapeSql(bdb)}', ` +
    `${homonym}` +
    `);`
  );
}

writeFileSync('./scripts/roots-import.sql', lines.join('\n'), 'utf8');
console.log(`Done. ${rows.length} roots written, ${bdbMatchCount} had BDB definitions.`);