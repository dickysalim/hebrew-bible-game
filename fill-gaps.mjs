// fill-gaps.mjs
// Finds word IDs and root keys referenced in verse files but missing from
// words.json / roots.json, then generates entries via DeepSeek.
//
// Usage: node fill-gaps.mjs

import 'dotenv/config';
import fs from 'fs';
import { transliterate } from 'hebrew-transliteration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripNikud(str) {
  return str.replace(/[\u0591-\u05C7]/g, '').replace(/[\u05F3\u05F4]/g, '').trim();
}

function generateSBL(hebrew) {
  try {
    return transliterate(hebrew).replace(/\/+/g, '').trim();
  } catch {
    return stripNikud(hebrew);
  }
}

async function callDeepSeek(prompt, maxTokens = 400) {
  await new Promise(r => setTimeout(r, 300));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_DATALAYER_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      console.log(`  DeepSeek attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('DeepSeek failed after 3 attempts');
}

// ---------------------------------------------------------------------------
// Word explanation generator
// ---------------------------------------------------------------------------

async function generateWordExplanation(id, root, pos, segments) {
  const prompt = `You are writing a word explanation for a Hebrew Bible learning game.

Hebrew word (consonants only, no nikud): ${id}
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
// Root explanation generator
// ---------------------------------------------------------------------------

async function generateRootExplanation(rootKey, sbl) {
  const prompt = `You are writing a root explanation for a Hebrew Bible learning game.

Root (consonants only, no nikud): ${rootKey}
SBL transliteration: ${sbl}

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const wordsPath = './src/data/words.json';
  const rootsPath = './src/data/roots.json';
  const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
  const rootsData = JSON.parse(fs.readFileSync(rootsPath, 'utf8'));

  const chapters = ['genesis-1', 'genesis-2', 'genesis-3'];

  // Collect all missing word IDs and their context (sbl from verse file)
  const missingWords = new Map(); // id -> { sbl }
  // Collect all roots referenced by existing words but missing from roots.json
  const missingRoots = new Map(); // rootKey -> { sbl } (best sbl we can derive)

  for (const ch of chapters) {
    const data = JSON.parse(fs.readFileSync(`./src/data/verses/${ch}.json`, 'utf8'));
    for (const v of data.verses) {
      for (const w of (v.words || [])) {
        if (!w.id) continue;

        // Missing word
        if (!wordsData.words[w.id] && !missingWords.has(w.id)) {
          missingWords.set(w.id, { sbl: w.sbl || generateSBL(w.id) });
        }

        // Existing word but root missing
        if (wordsData.words[w.id]) {
          const root = wordsData.words[w.id].root;
          if (root && !rootsData.roots[root] && !missingRoots.has(root)) {
            const wordEntry = wordsData.words[w.id];
            const sbl = wordEntry.root_sbl || wordEntry.word_sbl || generateSBL(root);
            missingRoots.set(root, { sbl });
          }
        }
      }
    }
  }

  console.log(`Found ${missingWords.size} missing word(s) and ${missingRoots.size} missing root(s)`);
  console.log('');

  // ---------------------------------------------------------------------------
  // Fill missing words
  // ---------------------------------------------------------------------------

  let wordsFilled = 0;
  for (const [id, { sbl }] of missingWords) {
    console.log(`Generating word: ${id} (${sbl})`);
    const segments = [{ type: 'root', letters: id.split('') }];
    const pos = 'particle'; // safe default for unknown words
    const root = id; // fallback root = word itself

    try {
      const explanation = await generateWordExplanation(id, root, pos, segments);
      wordsData.words[id] = {
        gloss: '',
        root,
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
      wordsFilled++;
      process.stdout.write(`  ✓ ${id}\n`);
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Fill missing roots
  // ---------------------------------------------------------------------------

  let rootsFilled = 0;
  for (const [rootKey, { sbl }] of missingRoots) {
    console.log(`Generating root: ${rootKey} (${sbl})`);
    try {
      const explanation = await generateRootExplanation(rootKey, sbl);
      rootsData.roots[rootKey] = {
        sbl,
        gloss: '',
        bdb: '',
        strongs: '',
        explanation,
      };
      rootsFilled++;
      process.stdout.write(`  ✓ ${rootKey}\n`);
    } catch (err) {
      console.error(`  ✗ ${rootKey}: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 2), 'utf8');
  fs.writeFileSync(rootsPath, JSON.stringify(rootsData, null, 2), 'utf8');

  console.log('');
  console.log(`✅ Done — filled ${wordsFilled} word(s) and ${rootsFilled} root(s)`);
  console.log(`Total words: ${Object.keys(wordsData.words).length}`);
  console.log(`Total roots: ${Object.keys(rootsData.roots).length}`);
}

main().catch(console.error);
