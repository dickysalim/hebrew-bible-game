import { supabase } from './supabase'

/**
 * Load user progress from Supabase
 * @param {string} userId - The user's UUID from Supabase auth
 * @returns {Promise<object|null>} Progress data or null if not found
 */
export async function loadProgress(userId) {
  if (!userId) {
    console.warn('loadProgress: No userId provided')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user has no saved progress yet
        return null
      }
      console.error('Error loading progress from Supabase:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception loading progress from Supabase:', error)
    return null
  }
}

/**
 * Save user progress to Supabase
 * @param {string} userId - The user's UUID from Supabase auth
 * @param {object} progress - Progress data to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveProgress(userId, progress) {
  if (!userId) {
    console.warn('saveProgress: No userId provided')
    return false
  }

  // Extract the fields we want to save
  const progressData = {
    user_id: userId,
    discovered_roots: progress.discoveredRoots || [],
    completed_verses: progress.completedVerses || [],
    word_encounters: progress.wordEncounters || {},
    current_verse_index: progress.currentVerseIndex || 0,
    typed_counts: progress.typedCounts || {},
    active_word_idx: progress.activeWordIdx !== undefined ? progress.activeWordIdx : 0,
    highest_verse: progress.highestVerse || 0,
    carousel_idx_map: progress.carouselIdxMap || {},
    celebrated_verses: progress.celebratedVerses || [],
    updated_at: new Date().toISOString(),
  }
  
  // Only include discovered_words_by_root if it exists in the progress object
  // This makes the field optional for backward compatibility
  if (progress.discoveredWordsByRoot !== undefined) {
    progressData.discovered_words_by_root = progress.discoveredWordsByRoot || {}
  }

  // Store per-chapter progress map (v2)
  if (progress.chapters !== undefined) {
    progressData.chapters = progress.chapters
  }

  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('Error saving progress to Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception saving progress to Supabase:', error)
    return false
  }
}

/**
 * Helper function to convert game state to Supabase progress format
 * @param {object} gameState - GamePanel reducer state
 * @param {array} contextDiscoveredRoots - Array of discovered root objects from RootDiscoveryContext
 * @param {object} contextDiscoveredWordsByRoot - Object mapping root IDs to arrays of word objects from RootDiscoveryContext
 * @param {object} allChapters - Per-chapter progress map { [stageIndex]: { typedCounts, ... } }
 * @returns {object} Progress data formatted for Supabase
 */
export function formatProgressForSupabase(gameState, contextDiscoveredRoots, contextDiscoveredWordsByRoot = {}, allChapters = {}) {
  // Calculate completed verses from typedCounts
  const completedVerses = []
  if (gameState.typedCounts) {
    // This is a simplified calculation - in reality, we need to check each verse
    // For now, we'll assume verses are completed if they have any typed counts
    // A more accurate implementation would check if all words in a verse are completed
    Object.keys(gameState.typedCounts).forEach(key => {
      const [verseIndex] = key.split('-').map(Number)
      if (!completedVerses.includes(verseIndex)) {
        completedVerses.push(verseIndex)
      }
    })
  }

  return {
    discoveredRoots: contextDiscoveredRoots || [],
    discoveredWordsByRoot: contextDiscoveredWordsByRoot || {},
    completedVerses,
    wordEncounters: gameState.wordEncounters || {},
    currentVerseIndex: gameState.currentVerse || 0,
    typedCounts: gameState.typedCounts || {},
    activeWordIdx: gameState.activeWordIdx !== undefined ? gameState.activeWordIdx : 0,
    highestVerse: gameState.highestVerse || 0,
    carouselIdxMap: gameState.carouselIdxMap || {},
    celebratedVerses: gameState.celebratedVerses || [],
    stageIndex: gameState.stageIndex || 1,
    chapters: allChapters,
  }
}

/**
 * Helper function to convert Supabase progress data to game state format
 * @param {object} supabaseProgress - Progress data from Supabase
 * @returns {object} Game state data
 */
export function formatProgressFromSupabase(supabaseProgress) {
  if (!supabaseProgress) return null

  const result = {
    discoveredRoots: supabaseProgress.discovered_roots || [],
    discoveredWordsByRoot: supabaseProgress.discovered_words_by_root || {},
    completedVerses: supabaseProgress.completed_verses || [],
    wordEncounters: supabaseProgress.word_encounters || {},
    currentVerseIndex: supabaseProgress.current_verse_index || 0,
    typedCounts: supabaseProgress.typed_counts || {},
    activeWordIdx: supabaseProgress.active_word_idx !== undefined ? supabaseProgress.active_word_idx : 0,
    highestVerse: supabaseProgress.highest_verse || 0,
    carouselIdxMap: supabaseProgress.carousel_idx_map || {},
    celebratedVerses: supabaseProgress.celebrated_verses || [],
    stageIndex: supabaseProgress.stage_index || 1,
  }

  // Include per-chapter map if it exists in Supabase
  if (supabaseProgress.chapters) {
    result.chapters = supabaseProgress.chapters
  }

  return result
}