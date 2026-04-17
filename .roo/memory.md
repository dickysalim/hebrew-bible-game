# Project Memory

## Stack
- React Vite with TypeScript/JavaScript
- React Context API for state management
- useReducer for complex game state
- LocalStorage for persistence
- Audio feedback system with multiple sound effects

## Architecture

### Application Overview
This is a Hebrew Bible learning game focused on Genesis 1. Users type Hebrew words from the biblical text while discovering Hebrew roots and building a lexicon. The application combines language learning with gamification through root discovery mechanics.

### Key Components and Relationships

#### Core Application Structure
1. **Main Entry Point** ([`src/main.jsx`](src/main.jsx))
   - Wraps the app with `RootDiscoveryProvider` for global state
   - Sets up React rendering

2. **App Component** ([`src/App.jsx`](src/App.jsx))
   - Main container with tab-based navigation (Main, Lexicon, Progress, Full Chapter)
   - Keyboard shortcuts (Ctrl+1, Ctrl+2, Ctrl+3) for tab switching
   - Manages active tab state and renders corresponding panels

#### State Management
1. **RootDiscoveryContext** ([`src/contexts/RootDiscoveryContext.jsx`](src/contexts/RootDiscoveryContext.jsx))
   - Global context for discovered roots and words
   - Persists to LocalStorage with `discoveredRoots` and `discoveredWordsByRoot` keys
   - Tracks new roots for badge notifications
   - Provides functions: `addDiscoveredRoot`, `addDiscoveredWord`, `clearNewRoots`

#### Game Components
1. **GamePanel** ([`src/components/main/GamePanel.jsx`](src/components/main/GamePanel.jsx))
   - Core gameplay component with complex useReducer state management
   - State includes: current verse, typed text, completed words, discovered roots, progress
   - Handles typing mechanics, word completion, root detection
   - Integrates audio feedback system with multiple sound types
   - Uses sub-components:
     - `VerseScroll`: Displays Hebrew verse with typing interface
     - `InsightCarousel`: Shows linguistic insights for completed words
     - `ESVStrip`: Displays ESV translation with highlighted words
     - `KeyboardGuide`: Shows Hebrew keyboard layout
     - `WordDefinition`: Shows detailed word definitions
     - `RootFlag`: Visual indicator for root discoveries

2. **LexiconPanel** ([`src/components/lexicon/LexiconPanel.jsx`](src/components/lexicon/LexiconPanel.jsx))
   - Displays discovered roots and words in a lexicon format
   - Uses sub-components: `RootCard`, `RootDetail`, `ConcordancePanel`

3. **ProgressPanel** ([`src/components/progress/ProgressPanel.jsx`](src/components/progress/ProgressPanel.jsx))
   - Tracks user progress through Genesis 1
   - Shows completion statistics and achievements

4. **FullChapter** ([`src/components/full_chapter/FullChapter.jsx`](src/components/full_chapter/FullChapter.jsx))
   - Displays the complete Genesis 1 chapter with Hebrew text and ESV translation

#### Utility Modules
1. **rootDetection.js** ([`src/utils/rootDetection.js`](src/utils/rootDetection.js))
   - Contains `checkRootCompletion` function for detecting when all words containing a root have been completed
   - Logic for root discovery based on word completion

2. **hebrewData.js** ([`src/utils/hebrewData.js`](src/utils/hebrewData.js))
   - Utility functions for Hebrew text processing and data manipulation

3. **useProgressPersistence.js** ([`src/utils/useProgressPersistence.js`](src/utils/useProgressPersistence.js))
   - Custom hook for persisting game progress to LocalStorage

## Data Structures

### Words Data ([`src/data/words.json`](src/data/words.json))
- Contains detailed data for 6582 Hebrew words from Genesis 1
- Each word entry includes:
  - `gloss`: English translation/meaning
  - `root`: Hebrew root (3-letter consonantal root)
  - `pos`: Part of speech (noun, verb, etc.)
  - `segments`: Array of word segments (prefix, root, suffix)
    - Each segment has `type` and `letters` array
  - `explanation`: Detailed linguistic explanation
  - `sbl`: SBL (Society of Biblical Literature) transliteration
  - `strongs`: Strong's Concordance number (optional)

### Roots Data ([`src/data/roots.json`](src/data/roots.json))
- Contains detailed data for 52 Hebrew roots found in Genesis 1
- Each root entry includes:
  - `sbl`: SBL transliteration of the root
  - `gloss`: English meaning/gloss
  - `bdb`: Brown-Driver-Briggs Hebrew lexicon definition
  - `strongs`: Strong's number
  - `explanation`: Comprehensive explanation covering concrete and abstract meanings
  - Examples of roots: "ראש" (head/beginning), "ברא" (to create), "אלה" (God), "ארץ" (earth)

### Verses Data ([`src/data/verses/genesis-1.json`](src/data/verses/genesis-1.json))
- Contains all 31 verses of Genesis 1
- Each verse includes:
  - `verse`: Verse number (1-31)
  - `esv`: ESV (English Standard Version) translation
  - `insights`: Array of theological/linguistic insights for the verse
  - `words`: Array of word objects with:
    - `id`: Word ID matching keys in words.json
    - `sbl`: SBL transliteration
    - `esvHighlight`: Phrase in ESV translation that corresponds to this Hebrew word

### Letters Data ([`src/data/letters.json`](src/data/letters.json))
- Contains Hebrew alphabet information for keyboard display

## Game Mechanics

### Core Gameplay Loop
1. User types Hebrew words from the current verse
2. As words are completed:
   - Word completion sound plays
   - Word is added to discovered words
   - Linguistic insights are shown in carousel
3. When all words containing a particular root are completed:
   - Root discovery sound plays
   - Root is added to discovered roots
   - Root flag animation appears
4. Progress is saved to LocalStorage

### Root Discovery System
- Roots are discovered when ALL words containing that root in Genesis 1 have been typed
- Uses `checkRootCompletion` utility to track completion status
- Newly discovered roots trigger visual and audio feedback
- Discovered roots unlock detailed explanations in the lexicon

### Audio Feedback System
- Multiple sound types in [`src/assets/audio/`](src/assets/audio/):
  - `typing_sound1.mp3`, `typing_sound2.mp3`, `typing_sound3.mp3`: Typing feedback
  - `word_complete.mp3`: Word completion
  - `root_found.mp3`: Root discovery
  - `verse_complete.mp3`: Verse completion
  - `new_word.mp3`: New word discovery
  - `pop-1.mp3` to `pop-4.mp3`: Various UI sounds

### Progress Tracking
- Tracks completed words per verse
- Tracks discovered roots
- Persists progress across browser sessions
- Provides completion statistics

## State Management Patterns

### Context + Reducer Pattern
- **Global State**: `RootDiscoveryContext` manages discovered roots/words across the app
- **Local State**: `GamePanel` uses `useReducer` for complex game state with actions like:
  - `TYPE_CHARACTER`: Handle typing input
  - `COMPLETE_WORD`: Mark word as completed
  - `DISCOVER_ROOT`: Add newly discovered root
  - `NEXT_VERSE`: Advance to next verse
  - `LOAD_PROGRESS`: Load saved progress

### Persistence Strategy
- Dual-layer persistence:
  1. `RootDiscoveryContext` persists discovered roots/words to LocalStorage
  2. `GamePanel` persists game progress (current verse, completed words) separately
- Uses `useEffect` hooks to save on state changes
- Loads from LocalStorage on component mount

### Component Communication
- Parent components pass down state and callbacks
- Context provides global state access
- Custom hooks encapsulate complex logic (e.g., `useProgressPersistence`)

## Known Patterns

### Hebrew Text Processing
- Words are segmented into prefixes, roots, and suffixes
- SBL transliteration used for consistent representation
- Keyboard layout optimized for Hebrew input

### Educational Design
- Progressive disclosure: Basic typing → word completion → root discovery → detailed explanations
- Multiple learning modalities: Visual (typing interface), auditory (sound feedback), textual (explanations)
- Contextual learning: Words learned within biblical verses rather than isolation

### Performance Considerations
- Large JSON data files (words.json is 6582 lines) loaded once
- Lazy loading of audio files
- Efficient root detection with pre-computed data structures

## Solved Problems
- **Import path mismatch**: Fixed import statement in [`src/App.jsx:5`](src/App.jsx:5) from `./components/full_verse/FullChapter` to `./components/full_chapter/FullChapter` after folder was renamed from `full_verse` to `full_chapter`. This resolved the Vite build error "Failed to resolve import".

## Development Notes

### File Organization
- Components organized by feature (main, lexicon, progress, full_chapter)
- Sub-components placed in `sub-components/` directories
- Data files in `src/data/` with clear separation (words, roots, verses)
- Utilities in `src/utils/` for reusable logic

### Code Style
- Functional components with hooks
- Descriptive variable names (e.g., `discoveredRoots`, `completedWords`)
- Comprehensive comments in complex logic areas
- Consistent import organization

### Testing Considerations
- Root detection logic should be unit tested
- Game state reducer should have comprehensive test coverage
- LocalStorage mocking for persistence tests
- Audio playback testing (may require mocking)

## Future Development Considerations

### Potential Enhancements
1. **More Chapters**: Extend beyond Genesis 1 to entire Genesis or Pentateuch
2. **User Accounts**: Cloud sync of progress across devices
3. **Advanced Features**: Word games, quizzes, spaced repetition
4. **Mobile Optimization**: Touch-friendly interface for mobile devices
5. **Accessibility**: Screen reader support, keyboard navigation

### Technical Debt Areas
1. **Large JSON Files**: Consider splitting or lazy loading for performance
2. **Audio Loading**: Preload sounds to reduce latency
3. **State Complexity**: Consider refactoring GamePanel reducer if it grows further
4. **Type Safety**: Add TypeScript definitions for data structures