# Word Definition Panel Optimization Plan

## Current Issues Identified
1. **Excessive vertical spacing** pushes explanation section too low
2. **Part of Speech and Encounter counter** take full rows with borders
3. **Segment rows** have generous padding and borders
4. **Overall padding** (20px) could be reduced
5. **Margins between elements** are larger than necessary

## Proposed Changes

### 1. Container & Overall Layout
- Reduce padding from 20px to 16px
- Maintain scroll functionality
- Keep border and visual hierarchy

### 2. Hebrew Word Display
- Keep 42px font size (important for readability)
- Reduce bottom margin from 12px to 8px

### 3. SBL Transliteration
- Reduce font size from 18px to 16px
- Reduce bottom margin from 16px to 10px
- Keep center alignment

### 4. English Gloss
- Reduce font size from 20px to 18px
- Reduce bottom margin from 20px to 12px
- Keep center alignment and 600 font weight

### 5. Part of Speech & Encounter Counter (MAJOR CHANGE)
**Current:** Two separate rows with borders, 8px padding, 13px font
**Proposed:** Single compact row with inline layout
- Combine into one row: "Part of speech: [POS] • Encounter: [count]"
- Use smaller font (12px)
- Remove borders
- Reduce vertical space from ~56px to ~24px

### 6. Segment Rows Optimization
- Reduce padding from 10px 0 to 6px 0
- Reduce gap from 12px to 8px
- Reduce Hebrew font size from 22px to 18px
- Reduce SBL font size from 14px to 12px
- Keep grid layout but make more compact

### 7. Explanation Section
- Reduce top margin from 8px to 4px
- Reduce label bottom margin from 12px to 8px
- Keep explanation content at 14px for readability

### 8. Divider Spacing
- Reduce margin from 16px 0 to 10px 0

## Visual Hierarchy Preservation
1. **Primary focus**: Hebrew word (42px) remains largest
2. **Secondary**: English gloss (18px) and SBL (16px)
3. **Tertiary**: Segment details and explanation
4. **Metadata**: POS/Encounter (12px, subtle)

## CSS Changes Required

### Container
```css
.word-definition {
  padding: 16px; /* Reduced from 20px */
}
```

### Hebrew Word
```css
.hebrew-word-display {
  margin-bottom: 8px; /* Reduced from 12px */
}
```

### SBL Transliteration
```css
.sbl-transliteration {
  font-size: 16px; /* Reduced from 18px */
  margin-bottom: 10px; /* Reduced from 16px */
}
```

### English Gloss
```css
.english-gloss {
  font-size: 18px; /* Reduced from 20px */
  margin-bottom: 12px; /* Reduced from 20px */
}
```

### POS & Encounter (New combined style)
```css
.word-metadata {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.metadata-label {
  font-weight: 500;
}

.metadata-value {
  color: var(--text-primary);
  font-weight: 600;
}

.metadata-separator {
  color: var(--border);
}
```

### Segment Rows
```css
.segment-row {
  padding: 6px 0; /* Reduced from 10px 0 */
  gap: 8px; /* Reduced from 12px */
}

.segment-hebrew {
  font-size: 18px; /* Reduced from 22px */
}

.segment-sbl {
  font-size: 12px; /* Reduced from 14px */
}
```

### Divider
```css
.divider {
  margin: 10px 0; /* Reduced from 16px 0 */
}
```

### Explanation
```css
.explanation-section {
  margin-top: 4px; /* Reduced from 8px */
}

.explanation-label {
  margin-bottom: 8px; /* Reduced from 12px */
}
```

## Component Changes Required
1. **WordDefinition.jsx**: Combine grammatical-position and encounter-counter into single metadata row
2. **WordDefinition.css**: Update all CSS as outlined above
3. **Responsive design**: Update media queries accordingly

## Expected Results
- **~30-40% reduction** in vertical space before explanation section
- **Explanation appears higher** in the panel
- **All information preserved** and remains readable
- **Visual hierarchy maintained** with proper emphasis
- **Neat, professional appearance** with better space utilization

## Implementation Steps
1. Update CSS with reduced spacing and font sizes
2. Modify component to combine POS and Encounter
3. Test with various word lengths and explanations
4. Verify responsive behavior
5. Ensure accessibility and readability