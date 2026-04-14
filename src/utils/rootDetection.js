/**
 * Root detection utilities for Hebrew Bible Game
 * Detects when users type the last letter of a root within a word
 */

import wordsData from '../data/words.json';
import rootsData from '../data/roots.json';

/**
 * Get root information for a given word
 * @param {string} wordId - Hebrew word ID (e.g., "בראשית")
 * @returns {Object|null} Root info or null if no root
 */
export function getWordRootInfo(wordId) {
  const word = wordsData.words[wordId];
  if (!word || !word.root) return null;
  
  const root = rootsData.roots[word.root];
  if (!root) return null;
  
  return {
    rootId: word.root,
    rootLetters: word.root.split(''),
    rootData: root,
    wordData: word,
    segments: word.segments || [],
  };
}

/**
 * Find root segment position within word segments
 * @param {Array} segments - Word segments from words.json
 * @returns {Object|null} Root position info
 */
export function findRootSegmentPosition(segments) {
  let currentIndex = 0;
  let rootStartIdx = -1;
  let rootEndIdx = -1;
  
  for (const segment of segments) {
    const segmentLength = segment.letters.length;
    
    if (segment.type === 'root') {
      rootStartIdx = currentIndex;
      rootEndIdx = currentIndex + segmentLength - 1;
      break;
    }
    
    currentIndex += segmentLength;
  }
  
  if (rootStartIdx === -1) return null;
  
  return {
    start: rootStartIdx,
    end: rootEndIdx,
    length: rootEndIdx - rootStartIdx + 1,
  };
}

/**
 * Check if a root has just been completed by the latest typed letter
 * @param {string} wordId - Hebrew word ID
 * @param {number} typedCount - Number of letters typed so far (1-based, after the latest letter)
 * @param {Object} discoveredRoots - Map of already discovered roots
 * @returns {Object|null} Root discovery info if root just completed, null otherwise
 */
export function checkRootCompletion(wordId, typedCount, discoveredRoots = {}) {
  const rootInfo = getWordRootInfo(wordId);
  if (!rootInfo) return null;
  
  const { rootId, segments } = rootInfo;
  
  // If root already discovered, no need to detect again
  if (discoveredRoots[rootId]) return null;
  
  const rootPosition = findRootSegmentPosition(segments);
  if (!rootPosition) return null;
  
  // Check if the latest typed letter (typedCount) is the last letter of the root
  // typedCount is 1-based (1 = first letter typed, 2 = second letter, etc.)
  // rootPosition.end is 0-based index of the last root letter in the word
  // So root is completed when typedCount === rootPosition.end + 1
  if (typedCount === rootPosition.end + 1) {
    return {
      rootId,
      rootInfo,
      rootPosition,
      wordId,
      completedAt: Date.now(),
    };
  }
  
  return null;
}

/**
 * Get all words that use a specific root
 * @param {string} rootId - Hebrew root ID
 * @returns {Array} Array of word IDs that use this root
 */
export function getWordsByRoot(rootId) {
  const words = [];
  
  for (const [wordId, wordData] of Object.entries(wordsData.words)) {
    if (wordData.root === rootId) {
      words.push(wordId);
    }
  }
  
  return words;
}

/**
 * Filter discovered words from a list of word IDs
 * @param {Array} wordIds - Array of word IDs
 * @param {Object} wordEncounters - Map of word encounters from GamePanel state
 * @returns {Array} Word IDs that have been discovered (encountered at least once)
 */
export function filterDiscoveredWords(wordIds, wordEncounters = {}) {
  return wordIds.filter(wordId => {
    const encounterCount = wordEncounters[wordId] || 0;
    return encounterCount > 0;
  });
}

/**
 * Get word data for display in root detail table
 * @param {string} wordId - Hebrew word ID
 * @returns {Object} Word data for table display
 */
export function getWordDisplayData(wordId) {
  const word = wordsData.words[wordId];
  if (!word) return null;
  
  return {
    hebrew: wordId,
    sbl: word.sbl || '',
    gloss: word.gloss || '',
    root: word.root || null,
    pos: word.pos || '',
  };
}

/**
 * Get root display data for cards and detail view
 * @param {string} rootId - Hebrew root ID
 * @returns {Object} Root data for display
 */
export function getRootDisplayData(rootId) {
  const root = rootsData.roots[rootId];
  if (!root) return null;
  
  return {
    hebrew: rootId,
    sbl: root.sbl || '',
    gloss: root.gloss || '',
    bdb: root.bdb || '',
    strongs: root.strongs || '',
  };
}