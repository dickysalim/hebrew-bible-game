# Verse Completion Workflow Diagram

## System Flow

```mermaid
flowchart TD
    A[User Types Hebrew Letters] --> B{Word Completed?}
    B -->|No| C[Continue Typing]
    B -->|Yes| D[Play word_complete.mp3]
    D --> E{Verse Completed?}
    E -->|No| F[Move to Next Word]
    E -->|Yes| G[Play verse_complete.mp3]
    G --> H[Show InsightCarousel with Celebration Animation]
    H --> I[Start 6.5s Auto-Slide Timer]
    I --> J{User Interacts?}
    J -->|Yes| K[Reset Timer<br>Navigate Manually]
    J -->|No| L[Timer Expires]
    L --> M[Auto-Slide to Next Insight]
    M --> N{Reached End?}
    N -->|No| I
    N -->|Yes| O[Loop to First Insight]
    O --> I
    
    K --> I
    F --> A
```

## Component Interactions

```mermaid
sequenceDiagram
    participant User
    participant GamePanel
    participant VerseScroll
    participant AudioPlayer
    participant InsightCarousel
    
    User->>GamePanel: Types correct letter
    GamePanel->>VerseScroll: Update typed count
    GamePanel->>AudioPlayer: Play typing sound
    
    alt Word Completed
        GamePanel->>AudioPlayer: Play word_complete.mp3
    end
    
    alt Verse Completed
        GamePanel->>AudioPlayer: Play verse_complete.mp3
        GamePanel->>InsightCarousel: Show with animation
        InsightCarousel->>InsightCarousel: Start 6.5s auto-slide timer
    end
    
    loop Every 6.5 seconds
        InsightCarousel->>InsightCarousel: Auto-slide to next
    end
    
    User->>InsightCarousel: Click navigation
    InsightCarousel->>InsightCarousel: Reset timer
    InsightCarousel->>InsightCarousel: Manual navigation
```

## File Modification Map

```mermaid
graph TD
    A[Plan] --> B[index.css]
    A --> C[GamePanel.jsx]
    A --> D[KeyboardGuide.jsx]
    A --> E[InsightCarousel.jsx]
    
    B --> B1[Remove letter-spacing -0.5px]
    B --> B2[Add slideUpBounce animation]
    B --> B3[Remove typed-letter-box styles]
    
    C --> C1[Import verse_complete.mp3]
    C --> C2[Add verse completion audio logic]
    C --> C3[Update CAROUSEL_NAV reducer]
    
    D --> D1[Remove typed letter box JSX]
    
    E --> E1[Add auto-slide useEffect]
    E --> E2[Add animation trigger]
    E --> E3[Add timer reset on interaction]
    
    style B fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#e8f5e8
    style E fill:#fff3e0
```

## Animation Timeline

```mermaid
gantt
    title InsightCarousel Celebration Animation
    dateFormat  SS
    axisFormat %S
    
    section Animation Phases
    Verse Completion :0, 1s
    Audio Playback :0, 2s
    Slide Up :1, 2s
    Bounce :2, 3s
    Settle :3, 4s
    
    section Auto-Slide Cycle
    Timer Start :4, 5s
    Display Insight 1 :4, 10s
    Auto-Slide to Insight 2 :10, 11s
    Display Insight 2 :11, 16s
    Auto-Slide to Insight 3 :16, 17s
    Loop Back to Insight 1 :17, 18s
```

## Key Implementation Points

1. **Kerning Removal**: Simple CSS change in `src/index.css` line 202
2. **Typed Letter Box Removal**: Remove JSX in `KeyboardGuide.jsx` and CSS in `index.css`
3. **Verse Completion Audio**: Add new audio ref and trigger in `GamePanel.jsx`
4. **Celebration Animation**: CSS keyframes + React state trigger
5. **Auto-Slide Timer**: `setInterval` with 6500ms in `InsightCarousel.jsx`
6. **Loop Logic**: Already implemented via modulo operation in reducer
7. **Timer Reset**: Clear and restart interval on user interaction