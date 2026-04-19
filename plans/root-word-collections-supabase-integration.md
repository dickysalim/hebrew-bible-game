# Root & Word Collections Supabase Integration Plan

## Problem Statement
Currently, the `RootDiscoveryContext` loads root and word collections from localStorage on initialization, even for authenticated users. When Supabase data loads via `LOAD_SUPABASE_PROGRESS` action, it only updates the GamePanel reducer state but doesn't update the `RootDiscoveryContext`. This causes root/word collections to be "tracked locally first" instead of using account-based progress.

## Requirements
1. When a user logs in, their root/word collections should be loaded from Supabase (not localStorage)
2. `RootDiscoveryContext` should initialize from Supabase data for authenticated users
3. All progress should save only to Supabase for authenticated users (users can't play without logging in)
4. There's a sync issue between devices for root collections that needs to be resolved

## Current Architecture Analysis

### RootDiscoveryContext (`src/contexts/RootDiscoveryContext.jsx`)
- Initializes from localStorage: `loadDiscoveredRootsFromStorage()` and `loadDiscoveredWordsByRootFromStorage()`
- Persists to localStorage whenever `discoveredRoots` or `discoveredWordsByRoot` changes
- Provides functions: `addDiscoveredRoot`, `addDiscoveredWordsForRoot`, `resetDiscoveredRoots`

### GamePanel Supabase Integration (`src/components/main/GamePanel.jsx`)
- Loads Supabase progress via `loadProgress(userId)` 
- Dispatches `LOAD_SUPABASE_PROGRESS` action to update reducer state
- Saves progress to Supabase via `saveProgress(userId, progressForSupabase)`
- Uses `formatProgressForSupabase()` which includes `contextDiscoveredRoots` from context

### Progress Library (`src/lib/progress.js`)
- `loadProgress()`: Queries `user_progress` table
- `saveProgress()`: Upserts to `user_progress` table
- `formatProgressForSupabase()`: Converts game state + context roots to Supabase format
- `formatProgressFromSupabase()`: Converts Supabase data to game state format

## Gaps Identified

1. **RootDiscoveryContext initializes from localStorage only** - No Supabase loading
2. **No mechanism to update RootDiscoveryContext from Supabase** - `LOAD_SUPABASE_PROGRESS` only updates reducer
3. **Context persists to localStorage even for authenticated users** - Should save to Supabase only
4. **Circular dependency** - `formatProgressForSupabase` uses context data (from localStorage) to save to Supabase
5. **No migration path** - localStorage → Supabase migration not implemented

## Implementation Plan

### Phase 1: Modify RootDiscoveryContext for Supabase Support

#### 1.1 Add Supabase Loading to RootDiscoveryContext
```javascript
// In RootDiscoveryContext.jsx
function loadDiscoveredRoots(userId) {
  if (userId) {
    // Load from Supabase via a new function or prop
    return loadRootsFromSupabase(userId)
  } else {
    return loadDiscoveredRootsFromStorage()
  }
}

function loadDiscoveredWordsByRoot(userId) {
  if (userId) {
    // Load from Supabase
    return loadWordsByRootFromSupabase(userId)
  } else {
    return loadDiscoveredWordsByRootFromStorage()
  }
}
```

#### 1.2 Add Context Update Functions
```javascript
const updateDiscoveredRootsFromSupabase = useCallback((rootsArray) => {
  setDiscoveredRoots(rootsArray)
}, [])

const updateDiscoveredWordsByRootFromSupabase = useCallback((wordsByRoot) => {
  setDiscoveredWordsByRoot(wordsByRoot)
}, [])
```

#### 1.3 Conditional localStorage Persistence
```javascript
useEffect(() => {
  if (userId) {
    // Don't save to localStorage for authenticated users
    return
  }
  try {
    localStorage.setItem(LEXICON_STORAGE_KEY, JSON.stringify({ 
      discoveredRoots, 
      discoveredWordsByRoot 
    }))
  } catch (e) {
    console.error('Failed to save lexicon to localStorage:', e)
  }
}, [discoveredRoots, discoveredWordsByRoot, userId])
```

### Phase 2: Update GamePanel Supabase Integration

#### 2.1 Update Context After Supabase Load
```javascript
// In GamePanel.jsx, after loading Supabase progress
if (supabaseProgress) {
  const formattedProgress = formatProgressFromSupabase(supabaseProgress)
  
  // Dispatch action to update game state
  dispatch({
    type: 'LOAD_SUPABASE_PROGRESS',
    payload: formattedProgress
  })
  
  // Update RootDiscoveryContext with Supabase data
  if (formattedProgress.discoveredRoots) {
    // Call new context function to update roots
  }
  if (formattedProgress.discoveredWordsByRoot) {
    // Call new context function to update words by root
  }
}
```

#### 2.2 Extend Progress Library
```javascript
// In progress.js, extend formatProgressFromSupabase
export function formatProgressFromSupabase(supabaseProgress) {
  if (!supabaseProgress) return null

  return {
    discoveredRoots: supabaseProgress.discovered_roots || [],
    discoveredWordsByRoot: supabaseProgress.discovered_words_by_root || {},
    completedVerses: supabaseProgress.completed_verses || [],
    wordEncounters: supabaseProgress.word_encounters || {},
    currentVerseIndex: supabaseProgress.current_verse_index || 0,
  }
}
```

### Phase 3: Data Migration & Cleanup

#### 3.1 Migration on Authentication
```javascript
// In App.jsx or AuthScreen.jsx, after successful login
const migrateLocalStorageToSupabase = async (userId) => {
  const localRoots = loadDiscoveredRootsFromStorage()
  const localWords = loadDiscoveredWordsByRootFromStorage()
  
  if (localRoots.length > 0 || Object.keys(localWords).length > 0) {
    // Save to Supabase
    await saveProgress(userId, {
      discoveredRoots: localRoots,
      discoveredWordsByRoot: localWords,
      // ... other progress
    })
    
    // Clear localStorage
    localStorage.removeItem(LEXICON_STORAGE_KEY)
  }
}
```

#### 3.2 Clear localStorage for Authenticated Users
```javascript
// In GamePanel.jsx, disable localStorage saving for authenticated users
useEffect(() => {
  if (!isLoaded || userId) return // Skip if user is authenticated
  
  // Only save to localStorage for unauthenticated users
  const progressToSave = { ... }
  saveProgress(progressToSave)
}, [isLoaded, userId, state.typedCounts, ...])
```

### Phase 4: Supabase Schema Updates (if needed)

#### 4.1 Add `discovered_words_by_root` column to `user_progress` table
```sql
ALTER TABLE user_progress 
ADD COLUMN discovered_words_by_root JSONB DEFAULT '{}'::jsonb;
```

#### 4.2 Update `saveProgress` to include `discovered_words_by_root`
```javascript
const progressData = {
  user_id: userId,
  discovered_roots: progress.discoveredRoots || [],
  discovered_words_by_root: progress.discoveredWordsByRoot || {},
  completed_verses: progress.completedVerses || [],
  word_encounters: progress.wordEncounters || {},
  current_verse_index: progress.currentVerseIndex || 0,
  updated_at: new Date().toISOString(),
}
```

## Implementation Steps

### Step 1: Update RootDiscoveryContext
1. Add `userId` prop to `RootDiscoveryProvider`
2. Modify initialization to conditionally load from Supabase
3. Add context update functions for Supabase data
4. Make localStorage persistence conditional

### Step 2: Update GamePanel
1. Add logic to update RootDiscoveryContext after Supabase load
2. Ensure proper dependency management
3. Handle loading states

### Step 3: Update Progress Library
1. Extend data structures to include `discoveredWordsByRoot`
2. Update format functions
3. Ensure backward compatibility

### Step 4: Implement Migration
1. Add migration function for localStorage → Supabase
2. Clear localStorage after migration
3. Handle edge cases (conflicts, partial data)

### Step 5: Testing
1. Test login flow with existing localStorage data
2. Test cross-device sync
3. Test offline/online transitions
4. Verify no data loss

## Files to Modify

1. `src/contexts/RootDiscoveryContext.jsx` - Major changes for Supabase support
2. `src/components/main/GamePanel.jsx` - Update Supabase loading to sync with context
3. `src/lib/progress.js` - Extend data structures
4. `src/App.jsx` - Possibly add migration logic
5. `src/components/ui/AuthScreen.jsx` - Add migration trigger

## Success Criteria

1. ✅ Authenticated users' root/word collections load from Supabase on login
2. ✅ RootDiscoveryContext initializes from Supabase for authenticated users
3. ✅ No localStorage persistence for authenticated users
4. ✅ Cross-device sync works for root collections
5. ✅ No data loss during migration from localStorage to Supabase
6. ✅ Backward compatibility for unauthenticated users

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Backup localStorage before migration, implement rollback |
| Sync conflicts | Use last-write-wins or implement conflict resolution |
| Performance issues with large collections | Implement pagination or incremental loading |
| Network failures | Maintain localStorage cache with sync retry logic |

## Timeline & Priority

**High Priority**: Phases 1 & 2 (Core functionality)
**Medium Priority**: Phase 3 (Migration & cleanup)  
**Low Priority**: Phase 4 (Schema updates - if needed)

The implementation should be done incrementally with thorough testing at each step.