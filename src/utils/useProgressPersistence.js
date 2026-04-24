import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hebrew-bible-game-progress';
const VERSION = '2.0'; // Bumped — now stores per-chapter progress

// Per-chapter progress shape (stored inside chapters map)
const defaultChapterProgress = {
  typedCounts: {},
  wordEncounters: {},
  highestVerse: 0,
  currentVerse: 0,
  activeWordIdx: 0,
  carouselIdxMap: {},
  celebratedVerses: [],
};

// Top-level saved structure
const defaultProgress = {
  version: VERSION,
  stageIndex: 1,             // which chapter the user is currently on
  chapters: {},              // { [stageIndex]: defaultChapterProgress }
};

/**
 * Custom hook for managing progress persistence in localStorage
 */
export function useProgressPersistence() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(defaultProgress);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed.version === VERSION) {
          // v2.0 — per-chapter structure
          setProgress({
            ...defaultProgress,
            ...parsed,
            version: VERSION,
          });
        } else if (parsed.version === '1.0') {
          // ── Migrate v1.0 (flat) → v2.0 (per-chapter) ──
          const si = parsed.stageIndex || 1;
          const migrated = {
            version: VERSION,
            stageIndex: si,
            chapters: {
              [si]: {
                typedCounts: parsed.typedCounts || {},
                wordEncounters: parsed.wordEncounters || {},
                highestVerse: parsed.highestVerse || 0,
                currentVerse: parsed.currentVerse || 0,
                activeWordIdx: parsed.activeWordIdx ?? 0,
                carouselIdxMap: parsed.carouselIdxMap || {},
                celebratedVerses: parsed.celebratedVerses || [],
              },
            },
          };
          setProgress(migrated);
          // Persist the migration immediately
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else {
          console.warn(`Progress version mismatch: expected ${VERSION}, got ${parsed.version}. Using defaults.`);
          setProgress(defaultProgress);
        }
      } else {
        setProgress(defaultProgress);
      }
    } catch (error) {
      console.error('Failed to load progress from localStorage:', error);
      setProgress(defaultProgress);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((data) => {
    try {
      const progressToSave = {
        version: VERSION,
        stageIndex: data.stageIndex || 1,
        chapters: data.chapters || {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));
      return true;
    } catch (error) {
      console.error('Failed to save progress to localStorage:', error);
      return false;
    }
  }, []);

  // Reset progress to defaults
  const resetProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setProgress(defaultProgress);
      return true;
    } catch (error) {
      console.error('Failed to reset progress:', error);
      return false;
    }
  }, []);

  // Get progress data for GamePanel initialization
  const getProgressData = useCallback(() => {
    return {
      stageIndex: progress.stageIndex,
      chapters: progress.chapters,
    };
  }, [progress]);

  return {
    isLoaded,
    progress: getProgressData(),
    saveProgress,
    resetProgress,
    getProgressData,
  };
}

/**
 * Utility function to save progress directly (for use outside hooks)
 */
export function saveProgressToStorage(data) {
  try {
    const progressToSave = {
      ...data,
      version: VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));
    return true;
  } catch (error) {
    console.error('Failed to save progress:', error);
    return false;
  }
}

/**
 * Utility function to load progress directly (for use outside hooks)
 * Returns the v2 per-chapter structure.
 */
export function loadProgressFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.version === VERSION) {
        return {
          stageIndex: parsed.stageIndex || 1,
          chapters: parsed.chapters || {},
        };
      }

      // Migrate v1.0 on-the-fly read
      if (parsed.version === '1.0') {
        const si = parsed.stageIndex || 1;
        return {
          stageIndex: si,
          chapters: {
            [si]: {
              typedCounts: parsed.typedCounts || {},
              wordEncounters: parsed.wordEncounters || {},
              highestVerse: parsed.highestVerse || 0,
              currentVerse: parsed.currentVerse || 0,
              activeWordIdx: parsed.activeWordIdx ?? 0,
              carouselIdxMap: parsed.carouselIdxMap || {},
              celebratedVerses: parsed.celebratedVerses || [],
            },
          },
        };
      }
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
  return {
    stageIndex: 1,
    chapters: {},
  };
}

/**
 * Helper: extract the flat chapter-progress for a given stageIndex
 * from the v2 structure. Returns defaultChapterProgress if not found.
 */
export function getChapterProgress(progressV2, stageIndex) {
  const ch = progressV2?.chapters?.[stageIndex];
  if (!ch) return { ...defaultChapterProgress };
  return {
    typedCounts: ch.typedCounts || {},
    wordEncounters: ch.wordEncounters || {},
    highestVerse: ch.highestVerse || 0,
    currentVerse: ch.currentVerse || 0,
    activeWordIdx: ch.activeWordIdx ?? 0,
    carouselIdxMap: ch.carouselIdxMap || {},
    celebratedVerses: ch.celebratedVerses || [],
  };
}

/**
 * Utility function to reset progress directly
 */
export function resetProgressInStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to reset progress:', error);
    return false;
  }
}