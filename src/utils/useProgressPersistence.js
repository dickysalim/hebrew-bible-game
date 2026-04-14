import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hebrew-bible-game-progress';
const VERSION = '1.0';

// Structure of saved progress data
const defaultProgress = {
  version: VERSION,
  typedCounts: {},
  wordEncounters: {},
  highestVerse: 0,
  currentVerse: 0,
  activeWordIdx: 0,
  carouselIdxMap: {},
  // We don't save temporary UI state like errorCount, wrongHebKeys, etc.
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
        
        // Validate version and merge with defaults
        if (parsed.version === VERSION) {
          setProgress({
            ...defaultProgress,
            ...parsed,
            version: VERSION, // Ensure correct version
          });
        } else {
          // Version mismatch - could implement migration here
          console.warn(`Progress version mismatch: expected ${VERSION}, got ${parsed.version}. Using defaults.`);
          setProgress(defaultProgress);
        }
      } else {
        // No saved progress, use defaults
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
        ...data,
        version: VERSION,
        // Don't save temporary UI state
        typedCounts: data.typedCounts || {},
        wordEncounters: data.wordEncounters || {},
        highestVerse: data.highestVerse || 0,
        currentVerse: data.currentVerse || 0,
        activeWordIdx: data.activeWordIdx ?? 0,
        carouselIdxMap: data.carouselIdxMap || {},
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
      typedCounts: progress.typedCounts,
      wordEncounters: progress.wordEncounters,
      highestVerse: progress.highestVerse,
      currentVerse: progress.currentVerse,
      activeWordIdx: progress.activeWordIdx,
      carouselIdxMap: progress.carouselIdxMap,
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
 */
export function loadProgressFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === VERSION) {
        return {
          typedCounts: parsed.typedCounts || {},
          wordEncounters: parsed.wordEncounters || {},
          highestVerse: parsed.highestVerse || 0,
          currentVerse: parsed.currentVerse || 0,
          activeWordIdx: parsed.activeWordIdx ?? 0,
          carouselIdxMap: parsed.carouselIdxMap || {},
        };
      }
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
  return {
    typedCounts: {},
    wordEncounters: {},
    highestVerse: 0,
    currentVerse: 0,
    activeWordIdx: 0,
    carouselIdxMap: {},
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