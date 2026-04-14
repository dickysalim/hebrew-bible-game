import React from 'react';
import { useProgressPersistence } from '../../utils/useProgressPersistence';
import versesFile from '../../data/verses/genesis-1.json';

const verses = versesFile.verses;

const ProgressPanel = () => {
  const { progress, resetProgress } = useProgressPersistence();
  
  // Calculate statistics
  const calculateStats = () => {
    const { typedCounts, wordEncounters, highestVerse } = progress;
    
    // Total words in all verses
    const totalWords = verses.reduce((sum, verse) => sum + verse.words.length, 0);
    
    // Count completed words (fully typed)
    let completedWords = 0;
    let partiallyTypedWords = 0;
    
    verses.forEach((verse, vi) => {
      verse.words.forEach((word, wi) => {
        const key = `${vi}-${wi}`;
        const typed = typedCounts[key] || 0;
        const wordLength = word.id.length;
        
        if (typed >= wordLength) {
          completedWords++;
        } else if (typed > 0) {
          partiallyTypedWords++;
        }
      });
    });
    
    // Count completed verses (all words in verse completed)
    let completedVerses = 0;
    verses.forEach((verse, vi) => {
      const allWordsCompleted = verse.words.every((word, wi) => {
        const key = `${vi}-${wi}`;
        const typed = typedCounts[key] || 0;
        return typed >= word.id.length;
      });
      if (allWordsCompleted) {
        completedVerses++;
      }
    });
    
    // Unique words encountered
    const uniqueWordsEncountered = Object.keys(wordEncounters).length;
    
    // Total word completions
    const totalWordCompletions = Object.values(wordEncounters).reduce((sum, count) => sum + count, 0);
    
    // Progress percentage
    const progressPercentage = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0;
    
    return {
      totalWords,
      completedWords,
      partiallyTypedWords,
      totalVerses: verses.length,
      completedVerses,
      highestVerse,
      uniqueWordsEncountered,
      totalWordCompletions,
      progressPercentage,
    };
  };
  
  const stats = calculateStats();
  
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all progress? This will clear all saved typing data.')) {
      resetProgress();
      window.location.reload(); // Reload to reflect reset
    }
  };
  
  return (
    <div className="progress-panel">
      <div className="progress-header">
        <h2 className="progress-title">📊 Learning Progress</h2>
        <p className="progress-subtitle">Track your Hebrew typing journey</p>
      </div>
      
      <div className="progress-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.progressPercentage}%</div>
            <div className="stat-label">Overall Progress</div>
            <div className="stat-progress-bar">
              <div 
                className="stat-progress-fill" 
                style={{ width: `${stats.progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.completedWords}/{stats.totalWords}</div>
            <div className="stat-label">Words Completed</div>
            <div className="stat-description">
              {stats.partiallyTypedWords > 0 && `+${stats.partiallyTypedWords} partially typed`}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.completedVerses}/{stats.totalVerses}</div>
            <div className="stat-label">Verses Completed</div>
            <div className="stat-description">
              Highest verse reached: {stats.highestVerse + 1}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.uniqueWordsEncountered}</div>
            <div className="stat-label">Unique Words</div>
            <div className="stat-description">
              {stats.totalWordCompletions > 0 && `Total completions: ${stats.totalWordCompletions}`}
            </div>
          </div>
        </div>
      </div>
      
      <div className="progress-details">
        <h3 className="details-title">Detailed Breakdown</h3>
        
        <div className="verse-progress-list">
          {verses.slice(0, Math.max(10, stats.highestVerse + 2)).map((verse, vi) => {
            const wordsInVerse = verse.words.length;
            let completedWordsInVerse = 0;
            
            verse.words.forEach((word, wi) => {
              const key = `${vi}-${wi}`;
              const typed = progress.typedCounts[key] || 0;
              if (typed >= word.id.length) {
                completedWordsInVerse++;
              }
            });
            
            const verseProgress = wordsInVerse > 0 
              ? Math.round((completedWordsInVerse / wordsInVerse) * 100) 
              : 0;
            
            const isCurrentVerse = vi === progress.currentVerse;
            const isHighestReached = vi <= stats.highestVerse;
            
            return (
              <div 
                key={vi} 
                className={`verse-progress-item ${isCurrentVerse ? 'current-verse' : ''} ${!isHighestReached ? 'not-reached' : ''}`}
              >
                <div className="verse-info">
                  <span className="verse-reference">Genesis 1:{vi + 1}</span>
                  <span className="verse-progress-text">
                    {completedWordsInVerse}/{wordsInVerse} words
                  </span>
                </div>
                <div className="verse-progress-bar">
                  <div 
                    className="verse-progress-fill" 
                    style={{ width: `${verseProgress}%` }}
                  ></div>
                </div>
                <div className="verse-status">
                  {isCurrentVerse ? '📍 Current' : 
                   completedWordsInVerse === wordsInVerse ? '✅ Complete' :
                   completedWordsInVerse > 0 ? '⏳ In Progress' :
                   isHighestReached ? '🔓 Unlocked' : '🔒 Locked'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="progress-actions">
        <div className="actions-note">
          <p>
            <strong>Note:</strong> Progress is automatically saved to your browser's local storage.
            It will persist between sessions but will be cleared if you clear browser data.
          </p>
          <p className="debug-note">
            <em>Debug: Press Ctrl+Shift+R in the Main tab to reset progress.</em>
          </p>
        </div>
        
        <button 
          className="reset-button" 
          onClick={handleReset}
          title="Reset all progress (for debugging)"
        >
          🔄 Reset Progress
        </button>
      </div>
    </div>
  );
};

export default ProgressPanel;