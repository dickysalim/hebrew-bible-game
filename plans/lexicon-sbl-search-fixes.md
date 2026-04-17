# Lexicon Tab SBL Root and Search Fixes

## Overview
This plan addresses two issues with the Lexicon Tab:
1. **SBL root text readability**: Change SBL transliteration text color for better contrast
2. **Search result card display**: Fix search results to show complete card information and remove purple border styling

## Current Issues Analysis

### 1. SBL Root Text Color
- **Current**: SBL text uses `color: var(--purple)` (#534AB7)
- **Problem**: Purple color may not have optimal contrast, especially in dark mode
- **User Request**: "just make it better contrast, so use what is contrasting better on light mode"
- **Solution**: Change to `color: var(--text-primary)` which is designed for optimal contrast in both light and dark modes

### 2. Search Result Card Display
- **Current Issue 1**: When filtering by search, cards only show Hebrew letter (missing SBL, gloss, Strong's)
  - Root cause: `LexiconPanel.jsx` line 49 maps search results to `{ id: result.id }`, stripping other data
- **Current Issue 2**: Searched cards have purple border/shadows (`root-card--search-match` class)
  - User request: "remove the purple border" and "card to be exactly the same as the one not being searched"
- **Solution**: 
  1. Pass full root objects from search results instead of just IDs
  2. Remove or neutralize search match styling

## Required Changes

### CSS Changes (`src/index.css`)

#### 1. Update SBL Text Color
```css
/* Change line 1228 */
.root-card__sbl {
  font-family: var(--font-serif);
  font-size: 15px;
  font-style: italic;
  color: var(--text-primary); /* Changed from var(--purple) */
  line-height: 1.3;
}
```

#### 2. Remove Search Match Styling
Option A: Remove all search match styling (recommended per user request)
```css
/* Remove or comment out lines 1292-1321 */
/* Search match card styling */
.root-card--search-match {
  /* Remove border-color and box-shadow */
}

/* Search relevance indicator - keep or remove? */
/* User didn't mention this, but it's part of search visual distinction */
```

Option B: Keep search indicator bar but remove border (compromise)
- Keep `.root-card__search-indicator` and `.root-card__search-indicator-bar`
- Remove `.root-card--search-match` border and shadow styling
- Remove `.root-card--search-match.root-card--clickable:hover` styling

### JavaScript Changes (`src/components/lexicon/LexiconPanel.jsx`)

#### 1. Fix Search Results Data
Current (line 49):
```javascript
const filteredRoots = searchQuery.trim()
  ? searchResults.map(result => ({ id: result.id }))
  : discoveredRoots
```

Proposed fix:
```javascript
const filteredRoots = searchQuery.trim()
  ? searchResults
  : discoveredRoots
```

#### 2. Update Sorting Logic
Need to adjust sorting to work with search results structure:
- Search results already sorted by score (descending) from `searchRoots` function
- Need to maintain "new cards first" priority even in search results
- Current sorting logic compares `sessionNewRoots` with root IDs

Updated sorting approach:
```javascript
return [...filteredRoots].sort((a, b) => {
  const aNew = sessionNewRoots.some(r => r.id === a.id)
  const bNew = sessionNewRoots.some(r => r.id === b.id)
  
  // New cards first
  if (aNew && !bNew) return -1
  if (!aNew && bNew) return 1
  
  // For search results, maintain score-based order
  if (searchQuery.trim() && a.score !== undefined && b.score !== undefined) {
    return b.score - a.score
  }
  
  return 0
})
```

#### 3. RootCard Props Update
The RootCard component already handles `searchScore` and `searchQuery` props correctly. No changes needed here.

## Implementation Steps

1. **Switch to Code mode** to make file edits
2. **Update CSS**:
   - Change SBL text color to `var(--text-primary)`
   - Remove search match border/shadows (Option A: remove all styling)
3. **Update LexiconPanel.jsx**:
   - Fix search results mapping to pass full objects
   - Update sorting logic to handle search results
4. **Test**:
   - Verify SBL text has better contrast in light/dark modes
   - Test search functionality shows complete cards
   - Verify searched cards look identical to non-searched cards (no purple border)
5. **Documentation**: Update this plan with any deviations or additional findings

## Considerations

### Dark Mode Compatibility
- `var(--text-primary)` is `#1C1810` in light mode, `#F0EAE0` in dark mode
- Both provide good contrast against card backgrounds (`#FFFFFF` light, `#1E1B17` dark)

### Search User Experience
- Removing all visual distinction for search matches might reduce usability
- Alternative: Keep subtle indicator (like the search relevance bar) without border changes
- Decision: Follow user request to "remove the purple border"

### Performance
- Passing full search result objects instead of just IDs has minimal performance impact
- Search results are already limited to discovered roots (typically < 52)

## Files to Modify
1. `src/index.css` - SBL color and search styling
2. `src/components/lexicon/LexiconPanel.jsx` - Search results handling

## Testing Checklist
- [ ] SBL text appears with better contrast in light mode
- [ ] SBL text appears with better contrast in dark mode  
- [ ] Search results show complete card information (SBL, gloss, Strong's)
- [ ] Searched cards have no purple border/shadows
- [ ] New cards still show "NEW" badge and animation
- [ ] Search relevance indicator bar still shows (if kept)
- [ ] Sorting: new cards appear first in search results
- [ ] Sorting: search results ordered by relevance score