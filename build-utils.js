// Shared utilities for build-data-layer.js and build-data-layer-test.js

import { transliterate } from 'hebrew-transliteration';

export function stripNikud(str) {
  return str
    .replace(/[֑-ׇ]/g, '')
    .replace(/[׳״]/g, '')
    .trim();
}

export function generateSBL(hebrewWithNikud) {
  try {
    const cleaned = hebrewWithNikud.replace(/\//g, '');
    return transliterate(cleaned)
      .replace(/\/+/g, '')
      .trim();
  } catch {
    return stripNikud(hebrewWithNikud);
  }
}

export async function callDeepSeek(prompt, maxTokens = 400) {
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

export async function generateESVSegments(words, englishText) {
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
    const reconstructed = parsed.map(s => s.t).join('');
    if (reconstructed === englishText) return parsed;
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
