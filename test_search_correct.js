// Test script for search functionality with correct usage
import { createSearchIndex, searchRoots, normalizeText } from './src/utils/searchUtils.js';

// Mock root data for testing - matching actual data structure
const mockRootsData = {
  roots: {
    'ברא': {
      sbl: 'bārāʾ',
      gloss: 'to create',
      bdb: 'to create — used exclusively of divine creation; never with a human subject in the qal stem',
      strongs: 'H1254',
      explanation: 'Test explanation'
    },
    'ארץ': {
      sbl: 'ʾereṣ',
      gloss: 'earth, land, ground',
      bdb: 'earth, land — the whole earth as opposed to heaven; also a specific territory or country',
      strongs: 'H776',
      explanation: 'Test explanation'
    },
    'שמים': {
      sbl: 'šāmayim',
      gloss: 'heaven, sky',
      bdb: 'heavens, sky — dual form; the visible expanse above the earth and the dwelling place of God',
      strongs: 'H8064',
      explanation: 'Test explanation'
    }
  }
};

// Convert to array format expected by search functions
const mockRootsArray = Object.entries(mockRootsData.roots).map(([id, data]) => ({
  id,
  ...data,
  // Add mock arrays for testing
  esvWords: id === 'ברא' ? ['create', 'created', 'creating'] : 
            id === 'ארץ' ? ['earth', 'land', 'ground'] : 
            ['heaven', 'heavens', 'sky'],
  hebrewWords: id === 'ברא' ? ['ברא', 'בורא', 'יברא'] : 
               id === 'ארץ' ? ['ארץ', 'הארץ', 'לארץ'] : 
               ['שמים', 'השמים', 'לשמים']
}));

console.log('Testing search functionality with correct usage...\n');

// Test 1: Create search index
console.log('Test 1: Creating search index...');
const searchIndex = createSearchIndex(mockRootsArray);
console.log(`Search index created with ${searchIndex.length} entries`);
if (searchIndex.length > 0) {
  console.log('Sample index entry keys:', Object.keys(searchIndex[0]));
}
console.log('');

// Test 2: Search for "create"
console.log('Test 2: Searching for "create"...');
const results1 = searchRoots('create', searchIndex);
console.log(`Found ${results1.length} results:`);
results1.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 3: Search for "earth" (should match ארץ)
console.log('Test 3: Searching for "earth"...');
const results2 = searchRoots('earth', searchIndex);
console.log(`Found ${results2.length} results:`);
results2.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 4: Search for Hebrew word "ברא"
console.log('Test 4: Searching for Hebrew "ברא"...');
const results3 = searchRoots('ברא', searchIndex);
console.log(`Found ${results3.length} results:`);
results3.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 5: Search for SBL transliteration "bara"
console.log('Test 5: Searching for SBL "bara"...');
const results4 = searchRoots('bara', searchIndex);
console.log(`Found ${results4.length} results:`);
results4.forEach((result, i) => {
  console.log(`  ${i + 1}. ${result.id} (${result.sbl}) - score: ${result.score.toFixed(3)}`);
});
console.log('');

// Test 6: Search for Strong's number "H1254"
console.log('Test 6: Searching for Strong\'s "H1254"...');
const results5 = searchRoots('H1254', searchIndex);
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