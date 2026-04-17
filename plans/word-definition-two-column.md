# Word Definition Panel - Two-Column Layout Implementation

## Current Structure
1. Hebrew word display
2. SBL transliteration
3. English gloss
4. Metadata (POS + Encounter)
5. Divider
6. Segment rows (prefix, root, suffix)
7. Divider
8. Explanation

## New Structure After Changes
### Top Section (Two Columns)
**Left Column:**
- Hebrew word display
- SBL transliteration  
- English gloss

**Right Column:**
- Segment rows (prefix, root, suffix)

### Bottom Section (Full Width)
- Metadata (POS + Encounter)
- Divider
- Explanation

## CSS Changes Required

### 1. Create Two-Column Container
```css
.word-definition-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.word-headline-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.segment-breakdown-column {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
```

### 2. Adjust Hebrew Word Display for Left Column
- Keep current styles but remove excessive bottom margins
- Align center within left column

### 3. Adjust Segment Rows for Right Column
- Remove borders between segment rows (use spacing instead)
- Adjust grid layout for compact vertical display
- Reduce font sizes further for right column

### 4. Update Metadata Positioning
- Move metadata below the two-column section
- Keep current compact styling

### 5. Responsive Design
- On smaller screens, switch to single column
- Stack left column above right column

## Component Changes Required

### WordDefinition.jsx Structure:
```jsx
<div className="word-definition">
  {/* New badge */}
  
  {/* Two-column header */}
  <div className="word-definition-header">
    {/* Left column */}
    <div className="word-headline-column">
      <div className="hebrew-word-display">{renderHebrewWord()}</div>
      <div className="sbl-transliteration">{sbl}</div>
      <div className="english-gloss">{gloss}</div>
    </div>
    
    {/* Right column */}
    <div className="segment-breakdown-column">
      {renderSegmentRow(prefixSegment, 'prefix')}
      {renderSegmentRow(rootSegment, 'root')}
      {renderSegmentRow(suffixSegment, 'suffix')}
    </div>
  </div>
  
  {/* Metadata (full width) */}
  <div className="word-metadata">...</div>
  
  {/* Divider */}
  <div className="divider"></div>
  
  {/* Explanation */}
  <div className="explanation-section">...</div>
</div>
```

## Segment Row Rendering Updates
- Update `renderSegmentRow` function to work in vertical column layout
- Remove borders between rows
- Adjust spacing for compact vertical layout

## Expected Benefits
1. **Significant space savings**: Hebrew word, SBL, and gloss share horizontal space with segment breakdown
2. **Better visual grouping**: Related information (word details) grouped together
3. **Improved hierarchy**: Grammar breakdown visually connected to word components
4. **Maintained readability**: All information remains accessible

## Implementation Steps
1. Add new CSS classes for two-column layout
2. Modify component structure to use two-column header
3. Update segment row styling for right column
4. Test with various word lengths
5. Ensure responsive behavior
6. Verify visual hierarchy and readability