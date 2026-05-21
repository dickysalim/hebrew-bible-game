import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hebrew-bible-game-progress';
const VERSION = '3.0';

const defaultProgress = {
  version: VERSION,
  currentStageIndex: 1,
  highestWordOrder: 0,
  currentWordOrder: 1,
  typedChars: 0,
};

export function useProgressPersistence() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(defaultProgress);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === VERSION) {
          setProgress({ ...defaultProgress, ...parsed });
        } else {
          localStorage.removeItem(STORAGE_KEY);
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

  const saveProgress = useCallback((data) => {
    try {
      const progressToSave = {
        version: VERSION,
        currentStageIndex: data.currentStageIndex ?? 1,
        highestWordOrder: data.highestWordOrder ?? 0,
        currentWordOrder: data.currentWordOrder ?? 1,
        typedChars: data.typedChars ?? 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));
      return true;
    } catch (error) {
      console.error('Failed to save progress to localStorage:', error);
      return false;
    }
  }, []);

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

  const getProgressData = useCallback(() => {
    return {
      currentStageIndex: progress.currentStageIndex,
      highestWordOrder: progress.highestWordOrder,
      currentWordOrder: progress.currentWordOrder,
      typedChars: progress.typedChars,
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

export function saveProgressToStorage(data) {
  try {
    const progressToSave = {
      version: VERSION,
      currentStageIndex: data.currentStageIndex ?? 1,
      highestWordOrder: data.highestWordOrder ?? 0,
      currentWordOrder: data.currentWordOrder ?? 1,
      typedChars: data.typedChars ?? 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));
    return true;
  } catch (error) {
    console.error('Failed to save progress:', error);
    return false;
  }
}

export function loadProgressFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === VERSION) {
        return {
          currentStageIndex: parsed.currentStageIndex ?? 1,
          highestWordOrder: parsed.highestWordOrder ?? 0,
          currentWordOrder: parsed.currentWordOrder ?? 1,
          typedChars: parsed.typedChars ?? 0,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
  return {
    currentStageIndex: 1,
    highestWordOrder: 0,
    currentWordOrder: 1,
    typedChars: 0,
  };
}

export function getChapterProgress() {
  return { highestWordOrder: 0, currentWordOrder: 1, typedChars: 0 };
}

export function resetProgressInStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to reset progress:', error);
    return false;
  }
}