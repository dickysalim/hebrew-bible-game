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
    stage_index: progress.currentStageIndex ?? 1,
    typed_counts: {
      highestWordOrder: progress.highestWordOrder ?? 0,
      currentWordOrder: progress.currentWordOrder ?? 1,
      typedChars: progress.typedChars ?? 0,
      showNikud: progress.settings?.showNikud ?? false,
    },
    discovered_roots: progress.discoveredRoots || [],
    show_sbl_word: progress.settings?.showSBLWord ?? true,
    show_sbl_letter: progress.settings?.showSBLLetter ?? true,
    show_gloss: progress.settings?.showGloss ?? true,
    show_tahot: progress.settings?.showTAHOT ?? true,
    expert_mode: progress.settings?.expertMode ?? false,
    fc_settings: progress.fcSettings || {},
    alphabet_progress: progress.alphabetProgress || {},
    updated_at: new Date().toISOString(),
  }

  if (progress.discoveredWordsByRoot !== undefined) {
    progressData.discovered_words_by_root = progress.discoveredWordsByRoot || {}
  }

  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(progressData, { onConflict: 'user_id' })
    if (error) {
      console.error('[saveProgress] ❌ Failed:', error.code, error.message)
      return false
    }
    console.log('[saveProgress] ✅ Saved')
    return true
  } catch (error) {
    console.error('[saveProgress] ❌ Exception:', error?.message || error)
    return false
  }
}

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

export function formatProgressForSupabase(
  gameState,
  contextDiscoveredRoots,
  contextDiscoveredWordsByRoot = {},
  settings = {},
  alphabetProgress = {},
  fcSettings = {}
) {
  return {
    discoveredRoots: contextDiscoveredRoots || [],
    discoveredWordsByRoot: contextDiscoveredWordsByRoot || {},
    currentStageIndex: gameState.currentStageIndex ?? 1,
    highestWordOrder: gameState.highestWordOrder ?? 0,
    currentWordOrder: gameState.currentWordOrder ?? 1,
    typedChars: gameState.typedChars ?? 0,
    settings: {
      showSBLWord: settings.showSBLWord ?? gameState.showSBLWord ?? true,
      showSBLLetter: settings.showSBLLetter ?? gameState.showSBLLetter ?? true,
      showGloss: settings.showGloss ?? gameState.showGloss ?? true,
      showTAHOT: settings.showTAHOT ?? gameState.showTAHOT ?? true,
      showNikud: settings.showNikud ?? gameState.showNikud ?? false,
      expertMode: settings.expertMode ?? gameState.expertMode ?? false,
    },
    alphabetProgress,
    fcSettings,
  }
}

export function formatProgressFromSupabase(supabaseProgress) {
  if (!supabaseProgress) return null

  const tc = supabaseProgress.typed_counts || {}
  const hasNewFormat = tc.highestWordOrder !== undefined

  const result = {
    discoveredRoots: supabaseProgress.discovered_roots || [],
    discoveredWordsByRoot: supabaseProgress.discovered_words_by_root || {},
    currentStageIndex: supabaseProgress.stage_index || 1,
    highestWordOrder: hasNewFormat ? (tc.highestWordOrder ?? 0) : 0,
    currentWordOrder: hasNewFormat ? (tc.currentWordOrder ?? 1) : 1,
    typedChars: hasNewFormat ? (tc.typedChars ?? 0) : 0,
    settings: {
      showSBLWord: supabaseProgress.show_sbl_word ?? true,
      showSBLLetter: supabaseProgress.show_sbl_letter ?? true,
      showGloss: supabaseProgress.show_gloss ?? true,
      showTAHOT: supabaseProgress.show_tahot ?? true,
      showNikud: tc.showNikud ?? supabaseProgress.show_nikud ?? false,
      expertMode: supabaseProgress.expert_mode ?? false,
    },
    fcSettings: supabaseProgress.fc_settings || {},
    alphabetProgress: supabaseProgress.alphabet_progress || {},
  }

  return result
}

export async function deleteProgress(userId) {
  if (!userId) return false
  console.log('[deleteProgress] Deleting progress for user:', userId)
  try {
    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', userId)
    if (error) {
      console.error('[deleteProgress] ❌ Failed:', error.code, error.message)
      return false
    }
    console.log('[deleteProgress] ✅ Deleted successfully')
    return true
  } catch (err) {
    console.error('[deleteProgress] ❌ Exception:', err?.message || err)
    return false
  }
}