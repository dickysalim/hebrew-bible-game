import { supabase } from './supabase'

export async function loadProgress(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error loading progress from Supabase:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Exception loading progress from Supabase:', error)
    return null
  }
}

export async function saveProgress(userId, progress) {
  if (!userId) return false

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
    // Settings
    show_sbl_word: progress.settings?.showSBLWord ?? true,
    show_sbl_letter: progress.settings?.showSBLLetter ?? true,
    // Alphabet training progress
    alphabet_progress: progress.alphabetProgress || {},
    updated_at: new Date().toISOString(),
  }

  if (progress.discoveredWordsByRoot !== undefined) {
    progressData.discovered_words_by_root = progress.discoveredWordsByRoot || {}
  }
  if (progress.chapters !== undefined) {
    progressData.chapters = progress.chapters
  }

  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(progressData, { onConflict: 'user_id' })
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
 * Partial upsert — only updates the specified columns.
 * Safe to call independently (e.g. alphabet-only or settings-only saves).
 */
export async function savePartialProgress(userId, fields) {
  if (!userId) return false
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(
        { user_id: userId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) {
      console.error('Error saving partial progress:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Exception saving partial progress:', error)
    return false
  }
}

/**
 * Format game state → Supabase payload.
 * @param {object} gameState
 * @param {array}  contextDiscoveredRoots
 * @param {object} contextDiscoveredWordsByRoot
 * @param {object} allChapters
 * @param {object} settings  — { showSBLWord, showSBLLetter }
 * @param {object} alphabetProgress — { level1: bool, … }
 */
export function formatProgressForSupabase(
  gameState,
  contextDiscoveredRoots,
  contextDiscoveredWordsByRoot = {},
  allChapters = {},
  settings = {},
  alphabetProgress = {}
) {
  const completedVerses = []
  if (gameState.typedCounts) {
    Object.keys(gameState.typedCounts).forEach(key => {
      const [verseIndex] = key.split('-').map(Number)
      if (!completedVerses.includes(verseIndex)) completedVerses.push(verseIndex)
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
    settings: {
      showSBLWord: settings.showSBLWord ?? gameState.showSBLWord ?? true,
      showSBLLetter: settings.showSBLLetter ?? gameState.showSBLLetter ?? true,
    },
    alphabetProgress,
  }
}

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
    // Settings
    settings: {
      showSBLWord: supabaseProgress.show_sbl_word ?? true,
      showSBLLetter: supabaseProgress.show_sbl_letter ?? true,
    },
    // Alphabet progress
    alphabetProgress: supabaseProgress.alphabet_progress || {},
  }

  if (supabaseProgress.chapters) {
    result.chapters = supabaseProgress.chapters
  }

  return result
}