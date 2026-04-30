# Graph Report - .  (2026-04-30)

## Corpus Check
- Corpus is ~38,878 words - fits in a single context window. You may not need a graph.

## Summary
- 300 nodes · 449 edges · 33 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Alphabet Training System|Alphabet Training System]]
- [[_COMMUNITY_Main Game Engine|Main Game Engine]]
- [[_COMMUNITY_Lexicon & Root Discovery|Lexicon & Root Discovery]]
- [[_COMMUNITY_Data Build Pipeline|Data Build Pipeline]]
- [[_COMMUNITY_App Shell & State Management|App Shell & State Management]]
- [[_COMMUNITY_Build Data & DeepSeek AI|Build Data & DeepSeek AI]]
- [[_COMMUNITY_Haber AI Companion|Haber AI Companion]]
- [[_COMMUNITY_Build Layer Test Suite|Build Layer Test Suite]]
- [[_COMMUNITY_ESV & Concordance Views|ESV & Concordance Views]]
- [[_COMMUNITY_App Component (AST)|App Component (AST)]]
- [[_COMMUNITY_Verse Data & Patch Scripts|Verse Data & Patch Scripts]]
- [[_COMMUNITY_Search & Lexicon Utilities|Search & Lexicon Utilities]]
- [[_COMMUNITY_Fill-Gaps Script|Fill-Gaps Script]]
- [[_COMMUNITY_Auth UI Components|Auth UI Components]]
- [[_COMMUNITY_Haber Server & Worker|Haber Server & Worker]]
- [[_COMMUNITY_ESV Alignment Transform|ESV Alignment Transform]]
- [[_COMMUNITY_VerseScroll & RootFlag|VerseScroll & RootFlag]]
- [[_COMMUNITY_LevelX Word Spelling|LevelX Word Spelling]]
- [[_COMMUNITY_Genesis 3 Patch Script|Genesis 3 Patch Script]]
- [[_COMMUNITY_Haber System Prompt|Haber System Prompt]]
- [[_COMMUNITY_Strip ESV Headers|Strip ESV Headers]]
- [[_COMMUNITY_TabBar Navigation|TabBar Navigation]]
- [[_COMMUNITY_Progress Panel|Progress Panel]]
- [[_COMMUNITY_Hebrew Letter Data|Hebrew Letter Data]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_Vite Config (AST)|Vite Config (AST)]]
- [[_COMMUNITY_Hebrew Keyboard Layout|Hebrew Keyboard Layout]]
- [[_COMMUNITY_Progress v1-v2 Migration|Progress v1-v2 Migration]]
- [[_COMMUNITY_README|README]]
- [[_COMMUNITY_Favicon SVG|Favicon SVG]]

## God Nodes (most connected - your core abstractions)
1. `GamePanel()` - 25 edges
2. `main()` - 15 edges
3. `main()` - 13 edges
4. `reducer()` - 11 edges
5. `LevelRoute()` - 9 edges
6. `playCorrect()` - 9 edges
7. `playLevelComplete()` - 9 edges
8. `Level6()` - 8 edges
9. `Level7()` - 8 edges
10. `App component` - 8 edges

## Surprising Connections (you probably didn't know these)
- `main()` --semantically_similar_to--> `main()`  [INFERRED] [semantically similar]
  build-data-layer.js → build-data-layer-test.js
- `index.html Entry Point` --references--> `GamePanel()`  [INFERRED]
  index.html → src/components/main/GamePanel.jsx
- `CLAUDE.md Project Instructions` --references--> `GamePanel()`  [INFERRED]
  CLAUDE.md → src/components/main/GamePanel.jsx
- `main()` --shares_data_with--> `words.json data file`  [EXTRACTED]
  build-data-layer-test.js → src/data/words.json
- `main()` --shares_data_with--> `roots.json data file`  [EXTRACTED]
  build-data-layer-test.js → src/data/roots.json

## Hyperedges (group relationships)
- **DeepSeek AI content generation pipeline (words, roots, insights, ESV segments)** — build_data_layer_calldeepseek, build_data_layer_generatewordexplanation, build_data_layer_generaterootexplanation, build_data_layer_generateinsight, build_data_layer_generateesvsegments, data_words_json, data_roots_json, data_verse_chapter_json [INFERRED 0.90]
- **Haber AI companion system prompt — dual deployment (Express server + Cloudflare Worker)** — server_haber_persona, server_buildystemprompt, server_haber_endpoint, worker_buildystemprompt, worker_haber_route, worker_fetch_handler [INFERRED 0.92]
- **Game progress persistence stack (sessionStorage cache + Supabase sync + localStorage fallback)** — progresscachecontext_provider, progresscachecontext_sessionstorage, progresscachecontext_updatecache, rootdiscoverycontext_localstorage, rootdiscoverycontext_supabase_sync [INFERRED 0.88]
- **Streak-based Alphabet Training Levels (3,4,5,6,7)** — level3_level3, level4_level4, level5_level5, level6_level6, level7_level7, streakbar_streakbar, sounds_playlevelcomplete [EXTRACTED 0.95]
- **Lexicon Three-View Navigation (Grid->Detail->Concordance)** — lexiconpanel_lexiconpanel, rootcard_rootcard, rootdetail_rootdetail, concordancepanel_concordancepanel [EXTRACTED 0.98]
- **Supabase Auth UI Components** — authscreen_authscreen, profilesettings_changeemailform, profilesettings_changepasswordform, profilesettings_verifycurrentpassword [EXTRACTED 0.95]
- **Game Progress Persistence Flow** — gamepanel_gamepanel, progress_saveprogress, supabase_supabase [EXTRACTED 0.95]
- **Word Definition Tab System** — worddeftabs_worddeftabs, worddefinition_worddefinition, wordroottab_wordroottab, wordconcordancetab_wordconcordancetab [EXTRACTED 1.00]
- **Root Discovery Feedback Loop** — gamepanel_reducer, versescroll_versescroll, rootflag_rootflag [INFERRED 0.85]

## Communities

### Community 0 - "Alphabet Training System"
Cohesion: 0.07
Nodes (30): AlphabetHub(), defaultAlphabetProgress(), HubGrid(), LevelRoute(), loadLocalAlphabetProgress(), Level1(), Level2(), buildQueue() (+22 more)

### Community 1 - "Main Game Engine"
Cohesion: 0.15
Nodes (19): CLAUDE.md Project Instructions, FullChapter(), GamePanel Dispatch Action Types, buildInitialStateFromCache(), firstIncomplete(), GamePanel(), getTyped(), GamePanel Initial State (+11 more)

### Community 2 - "Lexicon & Root Discovery"
Cohesion: 0.13
Nodes (9): buildCelebratedMap(), ConcordancePanel(), useCelebratedMap(), VerseEntry(), LexiconPanel(), RootCard(), RootDetail(), useRootDiscovery() (+1 more)

### Community 3 - "Data Build Pipeline"
Cohesion: 0.22
Nodes (18): callDeepSeek(), fetchWithCache(), generateESVSegments(), generateInsight(), generateRootExplanation(), generateSBL(), generateWordExplanation(), getOSHB() (+10 more)

### Community 4 - "App Shell & State Management"
Cohesion: 0.11
Nodes (19): App component, GameLayout component, MainMenuWrapper component, SetNewPasswordScreen component, Supabase auth integration (App), App entry point (main.jsx), useProgressCache hook, ProgressCacheProvider (+11 more)

### Community 5 - "Build Data & DeepSeek AI"
Cohesion: 0.16
Nodes (15): DeepSeek API (deepseek-chat), Auto-spawn fill-gaps after build, roots.json data file, words.json data file, callDeepSeek (fill-gaps), generateRootExplanation (fill-gaps), generateWordExplanation (fill-gaps), fill-gaps main() (+7 more)

### Community 6 - "Haber AI Companion"
Cohesion: 0.15
Nodes (11): HaberPanel(), useThinkingAnimation(), deleteProgress(), formatProgressForSupabase(), formatProgressFromSupabase(), loadProgress(), savePartialProgress(), saveProgress() (+3 more)

### Community 7 - "Build Layer Test Suite"
Cohesion: 0.32
Nodes (14): callDeepSeek(), fetchWithCache(), generateESVSegments(), generateInsight(), generateRootExplanation(), generateSBL(), generateWordExplanation(), getOSHB() (+6 more)

### Community 8 - "ESV & Concordance Views"
Cohesion: 0.18
Nodes (8): ESVStrip(), getEsvText(), loadProgressFromStorage(), useProgressPersistence(), buildCelebratedMap(), useCelebratedMap(), VerseEntry(), WordConcordanceTab()

### Community 9 - "App Component (AST)"
Cohesion: 0.2
Nodes (8): GameLayout(), MainMenuWrapper(), cacheKey(), loadFromSessionCache(), loadSessionCacheTimestamp(), removeSessionCache(), useProgressCache(), writeToSessionCache()

### Community 10 - "Verse Data & Patch Scripts"
Cohesion: 0.14
Nodes (11): Verse chapter JSON files (genesis-N.json), patch-genesis3-insights main, unwrapInsight, stripEsvH, assignPositions (backtracking), segmentESV, transformFile, CHAPTER_REGISTRY (+3 more)

### Community 11 - "Search & Lexicon Utilities"
Cohesion: 0.29
Nodes (8): SearchBar(), calculateMatchScore(), cleanupCache(), createSearchIndex(), debounce(), getCacheKey(), normalizeText(), searchRoots()

### Community 12 - "Fill-Gaps Script"
Cohesion: 0.36
Nodes (8): callDeepSeek(), generateRootExplanation(), generateSBL(), generateWordExplanation(), main(), stripNikud(), buildSystemPrompt(), fetch()

### Community 13 - "Auth UI Components"
Cohesion: 0.33
Nodes (6): AuthScreen(), MainMenu(), ChangeEmailForm(), ChangePasswordForm(), ProfileSettings(), verifyCurrentPassword()

### Community 14 - "Haber Server & Worker"
Cohesion: 0.33
Nodes (7): Anthropic SDK client (server), /api/haber POST endpoint, Haber AI Persona (chavruta companion), Anthropic SDK client (worker), buildSystemPrompt (worker), Cloudflare Worker fetch handler, Worker /api/haber route

### Community 15 - "ESV Alignment Transform"
Cohesion: 0.6
Nodes (5): assignPositions(), findAllOccurrences(), overlaps(), segmentESV(), transformFile()

### Community 16 - "VerseScroll & RootFlag"
Cohesion: 0.6
Nodes (3): RootFlag(), ActiveVerseWords(), VerseScroll()

### Community 17 - "LevelX Word Spelling"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Genesis 3 Patch Script"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Haber System Prompt"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Strip ESV Headers"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "TabBar Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Progress Panel"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Hebrew Letter Data"
Cohesion: 1.0
Nodes (2): letters.json data file, LETTER_SBL map

### Community 24 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "App Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Vite Config (AST)"
Cohesion: 1.0
Nodes (1): Vite Config

### Community 29 - "Hebrew Keyboard Layout"
Cohesion: 1.0
Nodes (1): Israeli QWERTY keyboard layout (KEYS, LATIN_TO_HEB)

### Community 30 - "Progress v1-v2 Migration"
Cohesion: 1.0
Nodes (1): Progress v1 to v2 migration logic

### Community 31 - "README"
Cohesion: 1.0
Nodes (1): README (React+Vite template)

### Community 32 - "Favicon SVG"
Cohesion: 1.0
Nodes (1): Favicon SVG (Hebrew letter icon)

## Ambiguous Edges - Review These
- `SearchBar()` → `GamePanel()`  [AMBIGUOUS]
  src/components/lexicon/sub-components/SearchBar.jsx · relation: semantically_similar_to

## Knowledge Gaps
- **35 isolated node(s):** `stripNikud (fill-gaps)`, `generateSBL (fill-gaps)`, `Vite Config`, `OSHB morphhb XML Data Source (GitHub)`, `KJV JSON Data Source (scrollmapper)` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Genesis 3 Patch Script`** (2 nodes): `patch-genesis3-insights.mjs`, `unwrapInsight()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Haber System Prompt`** (2 nodes): `buildSystemPrompt()`, `server.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Strip ESV Headers`** (2 nodes): `strip-esvh.mjs`, `stripEsvH()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TabBar Navigation`** (2 nodes): `TabBar.jsx`, `TabBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress Panel`** (2 nodes): `ProgressPanel()`, `ProgressPanel.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hebrew Letter Data`** (2 nodes): `letters.json data file`, `LETTER_SBL map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Entry Point`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `supabase.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config (AST)`** (1 nodes): `Vite Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hebrew Keyboard Layout`** (1 nodes): `Israeli QWERTY keyboard layout (KEYS, LATIN_TO_HEB)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress v1-v2 Migration`** (1 nodes): `Progress v1 to v2 migration logic`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `README`** (1 nodes): `README (React+Vite template)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Favicon SVG`** (1 nodes): `Favicon SVG (Hebrew letter icon)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `SearchBar()` and `GamePanel()`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `GamePanel()` connect `Main Game Engine` to `Lexicon & Root Discovery`, `Haber AI Companion`, `ESV & Concordance Views`, `App Component (AST)`, `Verse Data & Patch Scripts`, `Search & Lexicon Utilities`, `VerseScroll & RootFlag`?**
  _High betweenness centrality (0.407) - this node is a cross-community bridge._
- **Why does `useProgressCache()` connect `App Component (AST)` to `Alphabet Training System`, `Main Game Engine`, `Lexicon & Root Discovery`, `ESV & Concordance Views`?**
  _High betweenness centrality (0.277) - this node is a cross-community bridge._
- **Why does `AlphabetHub()` connect `Alphabet Training System` to `App Component (AST)`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `GamePanel()` (e.g. with `useProgressPersistence()` and `useProgressCache()`) actually correct?**
  _`GamePanel()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `reducer()` (e.g. with `checkRootCompletion()` and `formatProgressFromSupabase()`) actually correct?**
  _`reducer()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `stripNikud (fill-gaps)`, `generateSBL (fill-gaps)`, `Vite Config` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._