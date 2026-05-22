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
    typed_counts: {
      v: 3,
      currentStageIndex: progress.currentStageIndex ?? 1,
      highestWordOrder: progress.highestWordOrder ?? 0,
      currentWordOrder: progress.currentWordOrder ?? 1,
      typedChars: progress.typedChars ?? 0,
      settings: {
        showSBLWord: progress.settings?.showSBLWord ?? true,
        showSBLLetter: progress.settings?.showSBLLetter ?? true,
        showGloss: progress.settings?.showGloss ?? true,
        showTAHOT: progress.settings?.showTAHOT ?? true,
        showNikud: progress.settings?.showNikud ?? false,
        expertMode: progress.settings?.expertMode ?? false,
      },
      discoveredRoots: progress.discoveredRoots || [],
      discoveredWordsByRoot: progress.discoveredWordsByRoot || {},
      alphabetProgress: progress.alphabetProgress || {},
      fcSettings: progress.fcSettings || {},
    },
    updated_at: new Date().toISOString(),
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
    // For partial saves (fc_settings, alphabet_progress), we need to
    // read-modify-write the typed_counts JSONB
    const existing = await loadProgress(userId)
    const tc = existing?.typed_counts || {}
    const merged = { ...tc, ...fields }

    const { error } = await supabase
      .from('user_progress')
      .upsert(
        { user_id: userId, typed_counts: merged, updated_at: new Date().toISOString() },
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

  // v3 format: everything is inside typed_counts JSONB
  if (tc.v === 3) {
    return {
      discoveredRoots: tc.discoveredRoots || [],
      discoveredWordsByRoot: tc.discoveredWordsByRoot || {},
      currentStageIndex: tc.currentStageIndex ?? 1,
      highestWordOrder: tc.highestWordOrder ?? 0,
      currentWordOrder: tc.currentWordOrder ?? 1,
      typedChars: tc.typedChars ?? 0,
      settings: {
        showSBLWord: tc.settings?.showSBLWord ?? true,
        showSBLLetter: tc.settings?.showSBLLetter ?? true,
        showGloss: tc.settings?.showGloss ?? true,
        showTAHOT: tc.settings?.showTAHOT ?? true,
        showNikud: tc.settings?.showNikud ?? false,
        expertMode: tc.settings?.expertMode ?? false,
      },
      fcSettings: tc.fcSettings || {},
      alphabetProgress: tc.alphabetProgress || {},
    }
  }

  // Legacy fallback: read from scattered columns
  const hasNewFields = tc.highestWordOrder !== undefined
  return {
    discoveredRoots: supabaseProgress.discovered_roots || [],
    discoveredWordsByRoot: supabaseProgress.discovered_words_by_root || {},
    currentStageIndex: supabaseProgress.stage_index || 1,
    highestWordOrder: hasNewFields ? (tc.highestWordOrder ?? 0) : 0,
    currentWordOrder: hasNewFields ? (tc.currentWordOrder ?? 1) : 1,
    typedChars: hasNewFields ? (tc.typedChars ?? 0) : 0,
    settings: {
      showSBLWord: supabaseProgress.show_sbl_word ?? true,
      showSBLLetter: supabaseProgress.show_sbl_letter ?? true,
      showGloss: supabaseProgress.show_gloss ?? true,
      showTAHOT: supabaseProgress.show_tahot ?? true,
      showNikud: tc.showNikud ?? false,
      expertMode: supabaseProgress.expert_mode ?? false,
    },
    fcSettings: supabaseProgress.fc_settings || {},
    alphabetProgress: supabaseProgress.alphabet_progress || {},
  }
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