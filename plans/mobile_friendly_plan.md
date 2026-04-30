# Mobile-Friendly Plan — Hebrew Bible Game

## Context

The game was built desktop-first: it relies on a physical QWERTY keyboard mapped to Hebrew letters, a 2-column grid layout, and several side panels. On mobile, none of that works — there is no physical keyboard, the 2-column layout is too cramped, and panels like the word definition sidebar compete for the tiny screen. This plan makes the whole game playable on a phone without removing desktop functionality.

---

## Core Principles

- **Mobile ≤ 640px gets a completely different interaction model** — virtual keyboard, stacked layout, panels in bottom sheets.
- **Desktop is untouched.** Everything below is additive CSS + a new component rendered only on mobile.
- **Guidance features are preserved 1:1** — target key highlight, wrong key highlight, idle 5s pulse, SBL toggles all exist on the mobile keyboard.
- **No real phone keyboard.** We suppress the browser's default soft keyboard entirely (`readOnly` input or no input element at all) and use our virtual keyboard only.

---

## Layout Changes on Mobile (≤ 640px)

### Current (desktop)
```
[Tab Bar - top]
[Left: WordDef 1fr] [Right: Verse + ESV + Keyboard 1.6fr]
```

### New (mobile)
```
[Tab Bar - bottom, thumb-friendly]
[Verse Reference + Progress - top strip]
[Verse Display - center, most of screen]
[ESV Strip - collapsible, above keyboard]
[Mobile Hebrew Keyboard - pinned to bottom]
```

Word Definition moves to a **bottom sheet** that slides up when the user taps a word. It contains the same 3 tabs (Word | Root | Concordance) and the Haber button.

---

## New Component: `MobileHebrewKeyboard.jsx`

**Location:** `src/components/main/sub-components/MobileHebrewKeyboard.jsx`

### Key Layout (Israeli standard Hebrew phone layout — 3 rows + action row)
```
Row 1:  פ ם נ מ ל כ י ט ח ז
Row 2:  ו ה ד ג ב א ת ש ר ק
Row 3:  [final ⇧]  ץ צ ף  ן  ך  [⌫]
Row 4:  [SPACE / Submit]
```

- Final forms (sofit: ך ם ן ף ץ) accessible via a **Shift-like toggle key** on Row 3 — tap once to switch row 2/3 to sofit mode, tap again to go back.
- **No QWERTY labels** — keys show only the Hebrew letter (plus optional SBL below it when toggled on).
- Key size: ~42×48px, comfortable for thumbs.

### Guidance Features (same as KeyboardGuide)
| Feature | Mobile implementation |
|---|---|
| Target key highlight | Gold border + background pulse on the correct key |
| Wrong key highlight | Red flash on tapped key when wrong |
| Idle 5s pulse | Same CSS animation — scales the target key |
| SBL Letter toggle | Small gear icon → popover with SBL Letter / SBL Word checkboxes |
| F/J anchor indicators | Not shown (no physical keyboard context needed) |

### Props (identical shape to KeyboardGuide)
```jsx
<MobileHebrewKeyboard
  targetHeb={...}       // letter currently needed
  wrongHeb={...}        // letter just typed wrong
  onKey={fn}            // fires heb letter string on tap
  showSBLLetter={bool}
  showSBLWord={bool}
  onToggleSBLLetter={fn}
  onToggleSBLWord={fn}
/>
```

### Touch / Input handling
- Keys fire `onKey(heb)` on `onPointerDown` (faster than onClick, no 300ms delay).
- Space/Submit fires the existing `SPACE` dispatch.
- No `<input>` element rendered → browser soft keyboard never appears.
- The existing `useGameKeyboard` hook continues to work on desktop unchanged. On mobile a new `useMobileKeyboard` hook (or an `isMobile` branch inside `useGameKeyboard`) routes tap events into the same `dispatch` calls.

---

## Word Definition Bottom Sheet

**New component:** `src/components/main/sub-components/WordDefSheet.jsx`

- A sheet that slides up from the bottom (CSS transform + transition).
- Triggered by tapping any word in the verse, or by a small "Definition" pill button above the keyboard.
- Contains `<WordDefTabs />` unchanged — no new logic needed.
- Drag handle at top to dismiss. Tapping outside closes it.
- On desktop: component is never rendered (hidden via CSS `display:none` for `> 640px`).

---

## Tab Bar — Bottom on Mobile

**File:** `src/components/TabBar.jsx` + `src/index.css`

- On mobile, the tab bar moves from the top to the bottom (`position: fixed; bottom: 0`).
- Tabs become icon + label (larger tap targets, ≥44px height).
- The main content area gets `padding-bottom` equal to tab bar height so nothing is clipped.
- "← Menu" back button relocates to a hamburger icon in the verse header area.

---

## Insight Carousel — Full-Screen on Mobile

When a verse is completed on mobile, the InsightCarousel expands to a full-screen overlay (similar to a modal) instead of a small strip. Dismiss by tapping anywhere or swiping down. Same content, just more readable.

---

## Responsive Breakpoint Strategy

| Breakpoint | Layout |
|---|---|
| > 1024px | Current desktop layout, unchanged |
| 641px – 1024px | Tablet: existing 768px rules apply |
| ≤ 640px | New mobile layout: stacked, bottom sheet, mobile keyboard |

---

## Files to Create

| File | Purpose |
|---|---|
| `src/components/main/sub-components/MobileHebrewKeyboard.jsx` | New virtual keyboard component |
| `src/components/main/sub-components/WordDefSheet.jsx` | Bottom sheet wrapper for WordDefTabs |
| `src/hooks/useMobileKeyboard.js` | Routes virtual key taps to game dispatch |

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/main/GamePanel.jsx` | Render `MobileHebrewKeyboard` instead of `KeyboardGuide` on mobile; render `WordDefSheet`; adjust grid |
| `src/components/TabBar.jsx` | Move to bottom on mobile, larger touch targets |
| `src/index.css` | Add `@media (max-width: 640px)` block for all layout changes |
| `src/components/main/sub-components/InsightCarousel.jsx` | Full-screen overlay mode on mobile |

---

## What Gets Removed on Mobile (not deleted, just hidden via CSS)

- The left `word-definition-column` grid column → replaced by `WordDefSheet`
- The QWERTY `KeyboardGuide` → replaced by `MobileHebrewKeyboard`
- The F/J anchor key labels (no physical keyboard reference needed)
- Desktop `SBL controls` inline on keyboard → moved into a gear-icon popover

---

## What Stays Identical on Mobile

- Verse scroll and verse animation
- ESV strip (collapsible via tap on mobile)
- All game state logic (`gameReducer`, hooks)
- Supabase sync / localStorage
- Alphabet levels (TrainingKeyboard already shrinks to 34px keys at 480px; mobile keyboard can be used here too)
- Dark mode
- Haber AI panel (accessible inside `WordDefSheet`)

---

## Verification

1. Open game on Chrome DevTools iPhone 14 viewport (390×844) — verse should fill center, keyboard at bottom, no overlap.
2. Tap a word → bottom sheet slides up with correct definition.
3. Tap a key → letter dispatches, target key highlight clears, next target key lights up.
4. Wait 5 seconds without typing → idle pulse appears on target key.
5. Type wrong letter → that key flashes red.
6. Toggle SBL Letter in gear popover → SBL labels appear under each key.
7. Complete a verse → InsightCarousel appears as full-screen overlay, dismisses on tap.
8. Switch tabs → tab bar at bottom responds, correct panel shows.
9. Resize to desktop (> 640px) → original QWERTY layout and 2-column grid restore with no regressions.
10. Run on real iPhone (Safari) — verify no ghost soft keyboard appears.
