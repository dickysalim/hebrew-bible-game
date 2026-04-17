// Test script for search functionality
import { createSearchIndex, searchRoots, normalizeText } from './src/utils/searchUtils.js';

// Mock root data for testing
const mockRoots = [
  {
    id: 'ברא',
    sbl: 'bārāʾ',
    gloss: 'create',
    strongs: 'H1254',
    bdb: 'to create, shape, form',
    esvWords: ['create', 'created', 'creating'],
    hebrewWords: ['ברא', 'בורא', 'יברא']
  },
  {
    id: 'ארץ',
    sbl: 'ʾereṣ',
    gloss: 'earth, land',
    strongs: 'H776',
    bdb: 'earth, land, ground',
    esvWords: ['earth', 'land', 'ground'],
    hebrewWords: ['ארץ', 'הארץ', 'לארץ']
  },
  {
    id: 'שמים',
    sbl: 'šāmayim',
    gloss: 'heavens, sky',
    strongs: 'H8064',
    bdb: 'heaven, heavens, sky',
    esvWords: ['heaven', 'heavens', 'sky'],
    hebrewWords: ['שמים', 'השמים', 'לשמים']
  }
];

console.log('Testing search functionality...\n');

// Test 1: Create search index
console.log('Test 1: Creating search index...');
const searchIndex = createSearchIndex(mockRoots);
console.log(`Search index created with ${searchIndex.length} entries`);
console.log('Sample index entry:', JSON.stringify(searchIndex[0], null, 2));
console.log('');

// Test 2: Search for "create"
console.log('Test 2: Searching for "create"...');
const results1 = searchRoots(mockRoots, 'create');
console.log(`Found ${results1.length} results:`);
results1.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 3: Search for "earth" (should match ארץ)
console.log('Test 3: Searching for "earth"...');
const results2 = searchRoots(mockRoots, 'earth');
console.log(`Found ${results2.length} results:`);
results2.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 4: Search for Hebrew word "ברא"
console.log('Test 4: Searching for Hebrew "ברא"...');
const results3 = searchRoots(mockRoots, 'ברא');
console.log(`Found ${results3.length} results:`);
results3.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 5: Search for SBL transliteration "bara"
console.log('Test 5: Searching for SBL "bara"...');
const results4 = searchRoots(mockRoots, 'bara');
console.log(`Found ${results4.length} results:`);
results4.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 6: Search for Strong's number "H1254"
console.log('Test 6: Searching for Strong\'s "H1254"...');
const results5 = searchRoots(mockRoots, 'H1254');
console.log(`Found ${results5.length} results:`);
results5.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 7: Test text normalization
console.log('Test 7: Testing text normalization...');
const testStrings = [
  'bārāʾ',
  'BARA',
  'create',
  'CREATE',
  'ברא',
  'ארץ'
];
testStrings.forEach(str => {
  const normalized = normalizeText(str);
  console.log(`  "${str}" -> "${normalized}"`);
});
console.log('');

console.log('All tests completed!');