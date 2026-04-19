# Typing Progress Supabase Schema Update

## Problem
User typing progress (character-by-character typing, active word highlight position, etc.) was not being tracked in Supabase, only in localStorage. This meant that when users logged in from different devices, their typing progress was not preserved.

## Solution
Added missing typing progress fields to the Supabase `user_progress` table and updated the progress library to save/load these fields.

## Schema Changes Needed

Run these SQL commands in your Supabase database:

```sql
-- Add new columns to user_progress table
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS typed_counts jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS active_word_idx integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_verse integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS carousel_idx_map jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS celebrated_verses jsonb DEFAULT '[]';
```

## Field Descriptions

1. **`typed_counts`** (jsonb)
   - Stores the character-by-character typing progress for each word
   - Format: `{ "verseIndex-wordIndex": typedCharacterCount }`
   - Example: `{ "0-0": 3, "0-1": 5 }` means verse 0, word 0 has 3 characters typed, word 1 has 5 characters typed

2. **`active_word_idx`** (integer)
   - Tracks where the user's highlight/cursor is in the active verse
   - `0` = first word, `null` = nothing selected
   - Essential for restoring the user's typing position

3. **`highest_verse`** (integer)
   - Tracks the highest verse reached by the user
   - Used for progress tracking and navigation

4. **`carousel_idx_map`** (jsonb)
   - Stores carousel position per verse
   - Format: `{ "verseIndex": carouselPosition }`
   - Preserves the user's scroll position in the insight carousel for each verse

5. **`celebrated_verses`** (jsonb)
   - Array of verse indices that have already played the completion sound
   - Prevents replaying celebration sounds when revisiting completed verses

## Code Changes Made

### 1. `src/lib/progress.js`
- **`saveProgress`**: Added all new fields to `progressData` object
- **`formatProgressForSupabase`**: Extracts all typing progress fields from `gameState`
- **`formatProgressFromSupabase`**: Returns all typing progress fields in game state format

### 2. `src/components/main/GamePanel.jsx`
- **`LOAD_SUPABASE_PROGRESS` reducer case**: Updated to handle all new fields
- Now properly merges Supabase data with existing state for all typing-related fields

## Testing

To verify the fix works:

1. **Login with an existing account**
2. **Type some characters in a verse** - note the typing progress
3. **Move to a different word** - note the active highlight position
4. **Refresh the page or open in a different browser**
5. **Verify that**:
   - Typing progress is restored (characters typed per word)
   - Active word highlight is in the correct position
   - Highest verse reached is preserved
   - Carousel positions are restored
   - Celebration sounds don't replay for completed verses

## Backward Compatibility

The implementation is backward compatible:
- Existing user progress without the new fields will still load (default values will be used)
- New fields are optional in the code (using `||` default values)
- The `discovered_words_by_root` field remains optional for compatibility with older schema

## Notes

- The `completedVerses` field is still calculated from `typedCounts` for backward compatibility
- All JSONB fields default to empty objects/arrays to avoid null errors
- The `activeWordIdx` field uses explicit `!== undefined` checks to handle `null` values correctly