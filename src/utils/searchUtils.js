/**
 * Search utilities for the Lexicon Panel
 * Provides fuzzy matching across multiple fields for Hebrew roots and words
 */

/**
 * Normalize text for search comparison
 * - Converts to lowercase
 * - Removes diacritics from SBL transliteration
 * - Trims whitespace
 */
export function normalizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD') // Separate diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

/**
 * Get all words associated with a root from words data
 */
export function getAssociatedWords(rootId, wordsData) {
  if (!wordsData || !rootId) return [];
  
  return Object.entries(wordsData.words || {})
    .filter(([_, word]) => word.root === rootId)
    .map(([wordId, word]) => ({
      id: wordId,
      hebrew: wordId,
      sbl: word.word_sbl || '',
      gloss: word.gloss || '',
      esvHighlight: word.esvHighlight || ''
    }));
}

/**
 * Create a search index from discovered roots, roots data, and words data
 */
export function createSearchIndex(discoveredRoots, rootsData, wordsData) {
  if (!discoveredRoots || !rootsData || !wordsData) return [];
  
  return discoveredRoots.map(root => {
    const rootData = rootsData.roots[root.id];
    if (!rootData) return null;
    
    const associatedWords = getAssociatedWords(root.id, wordsData);
    
    return {
      id: root.id,
      hebrewRoot: root.id,
      sbl: rootData.sbl || '',
      gloss: rootData.gloss || '',
      bdb: rootData.bdb || '',
      strongs: rootData.strongs || '',
      explanation: rootData.explanation || '',
      associatedWords,
      
      // Pre-normalized search fields for performance
      _searchFields: {
        hebrewRoot: normalizeText(root.id),
        sbl: normalizeText(rootData.sbl),
        gloss: normalizeText(rootData.gloss),
        bdb: normalizeText(rootData.bdb),
        strongs: normalizeText(rootData.strongs),
        explanation: normalizeText(rootData.explanation),
        esvWords: associatedWords.map(w => normalizeText(w.esvHighlight)).join(' '),
        hebrewWords: associatedWords.map(w => normalizeText(w.hebrew)).join(' ')
      }
    };
  }).filter(Boolean);
}

/**
 * Calculate match score for a root against a query
 * Higher score = better match
 */
function calculateMatchScore(rootIndex, query, normalizedQuery) {
  let score = 0;
  const fields = rootIndex._searchFields;
  
  // Exact matches get highest scores
  if (fields.hebrewRoot === normalizedQuery) score += 100;
  if (fields.sbl === normalizedQuery) score += 80;
  if (fields.gloss.includes(normalizedQuery)) score += 60;
  if (fields.strongs === normalizedQuery) score += 50;
  
  // Partial matches
  if (fields.hebrewRoot.includes(normalizedQuery)) score += 40;
  if (fields.sbl.includes(normalizedQuery)) score += 35;
  if (fields.gloss.includes(normalizedQuery)) score += 30;
  if (fields.bdb.includes(normalizedQuery)) score += 20;
  if (fields.explanation.includes(normalizedQuery)) score += 15;
  if (fields.esvWords.includes(normalizedQuery)) score += 10;
  if (fields.hebrewWords.includes(normalizedQuery)) score += 25;
  
  // Strong's number partial match (e.g., "H721" matches "H7218")
  if (fields.strongs && normalizedQuery && fields.strongs.startsWith(normalizedQuery)) score += 45;
  
  return score;
}

// Simple cache for search results
const searchCache = new Map();
const CACHE_MAX_SIZE = 50;

/**
 * Clear old cache entries when cache gets too large
 */
function cleanupCache() {
  if (searchCache.size > CACHE_MAX_SIZE) {
    // Remove oldest entries (first 10)
    const keys = Array.from(searchCache.keys()).slice(0, 10);
    keys.forEach(key => searchCache.delete(key));
  }
}

/**
 * Generate cache key for search query
 */
function getCacheKey(query, searchIndex, options) {
  const normalizedQuery = normalizeText(query || '');
  const optionsKey = JSON.stringify(options || {});
  const indexKey = searchIndex ? searchIndex.length : 0;
  return `${normalizedQuery}|${indexKey}|${optionsKey}`;
}

/**
 * Search roots with fuzzy matching across all fields
 */
export function searchRoots(query, searchIndex, options = {}) {
  if (!query || !searchIndex || searchIndex.length === 0) {
    return searchIndex.map(item => ({ ...item, score: 0 }));
  }
  
  // Check cache first
  const cacheKey = getCacheKey(query, searchIndex, options);
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  // Optimization: Skip search for very short queries (less than 2 characters)
  // unless it's a Strong's number (starts with H) or Hebrew character
  const { minQueryLength = 2, includeAll = false } = options;
  const isStrongsQuery = query.trim().toUpperCase().startsWith('H');
  const isHebrewChar = /[\u0590-\u05FF]/.test(query);
  
  if (query.trim().length < minQueryLength && !isStrongsQuery && !isHebrewChar) {
    const result = searchIndex.map(item => ({ ...item, score: 0 }));
    searchCache.set(cacheKey, result);
    cleanupCache();
    return result;
  }
  
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    const result = searchIndex.map(item => ({ ...item, score: 0 }));
    searchCache.set(cacheKey, result);
    cleanupCache();
    return result;
  }
  
  // Optimization: Check for exact Hebrew root match first (fast path)
  if (normalizedQuery.length >= 2) {
    const exactHebrewMatch = searchIndex.find(rootIndex =>
      rootIndex._searchFields.hebrewRoot === normalizedQuery
    );
    
    if (exactHebrewMatch) {
      // Return single result with high score
      const result = [{
        ...exactHebrewMatch,
        score: 100,
        matches: true
      }];
      searchCache.set(cacheKey, result);
      cleanupCache();
      return result;
    }
  }
  
  // Calculate scores for all roots
  const scoredResults = searchIndex.map(rootIndex => {
    const score = calculateMatchScore(rootIndex, query, normalizedQuery);
    return {
      ...rootIndex,
      score,
      matches: score > 0
    };
  });
  
  // Filter out non-matches if requested
  const filteredResults = includeAll
    ? scoredResults
    : scoredResults.filter(item => item.score > 0);
  
  // Sort by score (descending)
  const finalResults = filteredResults.sort((a, b) => b.score - a.score);
  
  // Cache the results
  searchCache.set(cacheKey, finalResults);
  cleanupCache();
  
  return finalResults;
}

/**
 * Debounce function for search input
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}