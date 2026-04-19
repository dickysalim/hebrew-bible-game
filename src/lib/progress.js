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
    updated_at: new Date().toISOString(),
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
 * @returns {object} Progress data formatted for Supabase
 */
export function formatProgressForSupabase(gameState, contextDiscoveredRoots) {
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
    completedVerses,
    wordEncounters: gameState.wordEncounters || {},
    currentVerseIndex: gameState.currentVerse || 0,
  }
}

/**
 * Helper function to convert Supabase progress data to game state format
 * @param {object} supabaseProgress - Progress data from Supabase
 * @returns {object} Game state data
 */
export function formatProgressFromSupabase(supabaseProgress) {
  if (!supabaseProgress) return null

  return {
    discoveredRoots: supabaseProgress.discovered_roots || [],
    completedVerses: supabaseProgress.completed_verses || [],
    wordEncounters: supabaseProgress.word_encounters || {},
    currentVerseIndex: supabaseProgress.current_verse_index || 0,
  }
}