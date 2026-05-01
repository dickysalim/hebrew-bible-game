import lettersFile from '../data/letters.json'
import { getWord } from '../lib/lexiconCache'

// ─── Letter SBL sound map ─────────────────────────────────────────────────────
// Maps each Hebrew letter (including final forms) to its SBL transliteration
export const LETTER_SBL = {}
lettersFile.letters.forEach(l => { LETTER_SBL[l.letter] = l.sbl })
LETTER_SBL['ן'] = LETTER_SBL['נ']
LETTER_SBL['ם'] = LETTER_SBL['מ']
LETTER_SBL['ך'] = LETTER_SBL['כ']
LETTER_SBL['ץ'] = LETTER_SBL['צ']
LETTER_SBL['ף'] = LETTER_SBL['פ']

// ─── Letter type array ────────────────────────────────────────────────────────
// Returns ['prefix'|'root'|'suffix', ...] per letter position for a given word id
export function getLetterTypes(wordId) {
  const data = getWord(wordId)
  if (!data) return wordId.split('').map(() => 'root')
  const types = []
  data.segments.forEach(seg => seg.letters.forEach(() => types.push(seg.type)))
  while (types.length < wordId.length) types.push('root')
  return types.slice(0, wordId.length)
}

// ─── Israeli QWERTY keyboard layout ──────────────────────────────────────────
export const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.'],
]

export const KEYS = [
  { latin: 'q', heb: null },
  { latin: 'w', heb: null },
  { latin: 'e', heb: 'ק', sound: 'q' },
  { latin: 'r', heb: 'ר', sound: 'r' },
  { latin: 't', heb: 'א', sound: 'ʾ' },
  { latin: 'y', heb: 'ט', sound: 'ṭ' },
  { latin: 'u', heb: 'ו', sound: 'v' },
  { latin: 'i', heb: 'ן', sound: 'n' },
  { latin: 'o', heb: 'ם', sound: 'm' },
  { latin: 'p', heb: 'פ', sound: 'p/f' },
  { latin: 'a', heb: 'ש', sound: 'š' },
  { latin: 's', heb: 'ד', sound: 'd' },
  { latin: 'd', heb: 'ג', sound: 'g' },
  { latin: 'f', heb: 'כ', sound: 'k/kh' },
  { latin: 'g', heb: 'ע', sound: 'ʿ' },
  { latin: 'h', heb: 'י', sound: 'y' },
  { latin: 'j', heb: 'ח', sound: 'ḥ' },
  { latin: 'k', heb: 'ל', sound: 'l' },
  { latin: 'l', heb: 'ך', sound: 'kh' },
  { latin: ';', heb: 'ף', sound: 'f' },
  { latin: 'z', heb: 'ז', sound: 'z' },
  { latin: 'x', heb: 'ס', sound: 's' },
  { latin: 'c', heb: 'ב', sound: 'b/v' },
  { latin: 'v', heb: 'ה', sound: 'h' },
  { latin: 'b', heb: 'נ', sound: 'n' },
  { latin: 'n', heb: 'מ', sound: 'm' },
  { latin: 'm', heb: 'צ', sound: 'ṣ' },
  { latin: ',', heb: 'ת', sound: 't' },
  { latin: '.', heb: 'ץ', sound: 'ṣ' },
]

export const LATIN_TO_HEB = Object.fromEntries(
  KEYS.filter(k => k.heb).map(k => [k.latin, k.heb])
)
