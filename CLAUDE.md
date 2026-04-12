# Hebrew Bible Game

## What this is
A keyboard-based Hebrew Bible learning game. Users type Hebrew consonants 
to reveal ghosted words verse by verse through Genesis, discovering roots 
and building a personal lexicon as they go. Starting with Genesis 1:1-5 
as the first prototype.

## Philosophy
Learning through journey, not instruction. Inspired by WoW world exploration 
— the world gets smaller as your horizon expands. The game never interrupts. 
The left panel is the landscape. Speed typist and true learner walk the same 
road at different paces. Neither is wrong.

## Screen Layout
- Right side: typing game
- Left side Tab 1: live word and root explanation panel
- Left side Tab 2: root lexicon collectible
- Above ESV panel: locked until verse complete, unlocks to show what 
  translation could not show

## Core Mechanics
- Words displayed ghosted, consonants only, no nikud
- Typing reveals letters with color — blue prefix, coral root, teal suffix
- Word complete — fades to white, SBL appears below
- First time word encountered — highlight and chime sound
- Repeat encounter — silent, counter shown
- Root discovery — bell sound, card pops up, user dismisses, 
  card flies into lexicon tab
- Verse complete — panel above ESV unlocks permanently

## Root Lexicon
- 2000 roots total in Hebrew Bible
- Two states only: Undiscovered and Discovered
- Root becomes Discovered when user dismisses the card
- Opening lexicon shows collection animation and counter

## Critical Rules
- Letter pictographs are memory hooks ONLY — never used to derive 
  word or scriptural meaning
- Root scholarly meaning comes from BDB and Strong's only
- Verse unlock panel shows things invisible in translation — 
  wordplay, grammar surprises, root echoes. Never theological interpretation.
- Keyboard maps to standard Israeli keyboard layout
- F and J keys shown as anchors, all other latin letters hidden

## Data Structure
data/
  verses/
    genesis-1.json
  roots.json
  words.json
  letters.json

## Tech Stack
TBD — starting simple

## Current Status
- letters.json completed — 22 Hebrew letters with name, SBL, sound
- Building roots.json and words.json for Genesis 1:1-5 next
- Then genesis-1.json
- Then build the prototype UI