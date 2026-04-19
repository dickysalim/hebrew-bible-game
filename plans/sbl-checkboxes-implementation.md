# SBL Word and SBL Letter Checkboxes Implementation Plan

## Overview
Add two checkboxes to the keyboard panel on the right side to control the display of SBL Word and SBL Letter transliterations for the active verse.

## Requirements
1. Two checkboxes labeled "SBL Word" and "SBL Letter"
2. Both checked by default
3. Independent toggles (can check both, one, or none)
4. Placed inside the keyboard guide component on the right side
5. Controls SBL display for the currently visible verse

## Current State Analysis

### SBL Display Logic
- **SBL Letter**: Displayed below each Hebrew letter in `VerseScroll.jsx` (lines 162-164)
  ```jsx
  <span className={`word-sbl-ch ${isTyped || done ? 'visible' : ''}`}>
    {(isTyped || done) ? (LETTER_SBL[ch] || '') : ''}
  </span>
  ```
- **SBL Word**: Displayed below completed words in `VerseScroll.jsx` (line 171)
  ```jsx
  {done && <div className="word-full-sbl">{word.sbl}</div>}
  ```

### Component Hierarchy
```
GamePanel
├── VerseScroll (needs showSBLWord/showSBLLetter props)
└── KeyboardGuide (needs checkboxes + state callbacks)
```

## Implementation Steps

### 1. Update Reducer State (GamePanel.jsx)
Add to `initialState`:
```js
showSBLWord: true,
showSBLLetter: true,
```

Add reducer actions:
```js
case 'TOGGLE_SBL_WORD':
  return { ...state, showSBLWord: !state.showSBLWord };
case 'TOGGLE_SBL_LETTER':
  return { ...state, showSBLLetter: !state.showSBLLetter };
```

### 2. Update KeyboardGuide Component
#### Props Interface:
```jsx
KeyboardGuide({
  rows, keys, targetHeb, showActiveKey, wrongHebKeys,
  showSBLWord, showSBLLetter, onToggleSBLWord, onToggleSBLLetter
})
```

#### Component Changes:
1. Add a container div for checkboxes on the right side
2. Create two checkbox inputs with labels
3. Connect to props for state and callbacks

#### JSX Structure:
```jsx
<div className="keyboard-guide">
  <div className="kb-rows">
    {/* existing keyboard rows */}
  </div>
  
  <div className="sbl-controls">
    <label className="sbl-checkbox">
      <input 
        type="checkbox" 
        checked={showSBLLetter}
        onChange={onToggleSBLLetter}
      />
      <span>SBL Letter</span>
    </label>
    <label className="sbl-checkbox">
      <input 
        type="checkbox" 
        checked={showSBLWord}
        onChange={onToggleSBLWord}
      />
      <span>SBL Word</span>
    </label>
  </div>
</div>
```

### 3. Update GamePanel Component
#### Pass Props to KeyboardGuide:
```jsx
<KeyboardGuide
  rows={KEYBOARD_ROWS}
  keys={KEYS}
  targetHeb={targetLetter}
  showActiveKey={activeWord && !wordDone && errorCount >= 3}
  wrongHebKeys={wrongHebKeys}
  showSBLWord={state.showSBLWord}
  showSBLLetter={state.showSBLLetter}
  onToggleSBLWord={() => dispatch({ type: 'TOGGLE_SBL_WORD' })}
  onToggleSBLLetter={() => dispatch({ type: 'TOGGLE_SBL_LETTER' })}
/>
```

#### Pass Props to VerseScroll:
```jsx
<VerseScroll
  verses={verses}
  currentVerse={currentVerse}
  activeWordIdx={activeWordIdx}
  typedCounts={typedCounts}
  activeRootFlags={state.activeRootFlags}
  dispatch={dispatch}
  showSBLWord={state.showSBLWord}
  showSBLLetter={state.showSBLLetter}
/>
```

### 4. Update VerseScroll Component
#### Modify SBL Letter Display (lines 162-164):
```jsx
<span className={`word-sbl-ch ${(isTyped || done) && showSBLLetter ? 'visible' : ''}`}>
  {(isTyped || done) && showSBLLetter ? (LETTER_SBL[ch] || '') : ''}
</span>
```

#### Modify SBL Word Display (line 171):
```jsx
{done && showSBLWord && <div className="word-full-sbl">{word.sbl}</div>}
```

### 5. CSS Updates (src/index.css)
Add styles for:
1. `.sbl-controls` container
2. `.sbl-checkbox` styling
3. Layout adjustments for keyboard guide

#### Proposed CSS:
```css
/* SBL Controls */
.sbl-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 120px;
}

.sbl-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  user-select: none;
}

.sbl-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Update keyboard-guide layout */
.keyboard-guide {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
```

### 6. Testing Plan
1. Verify checkboxes appear on right side of keyboard
2. Test default state (both checked)
3. Test independent toggling
4. Verify SBL Letter display updates when checkbox toggled
5. Verify SBL Word display updates when checkbox toggled
6. Test with partially typed words
7. Test with completed words

## Files to Modify
1. `src/components/main/GamePanel.jsx` - Add state, reducer actions, pass props
2. `src/components/main/sub-components/KeyboardGuide.jsx` - Add checkboxes
3. `src/components/main/sub-components/VerseScroll.jsx` - Respect checkbox states
4. `src/index.css` - Add styling for checkboxes and layout

## Considerations
1. The checkboxes should be visually integrated with the keyboard guide design
2. State should persist across verse changes but not necessarily across page reloads (could add to localStorage if needed)
3. Ensure responsive design works with the new layout