import React, { useEffect, useState } from 'react';
import { getRootDisplayData } from '../../../utils/rootDetection';

/**
 * RootFlag component displays a "Root found" flag over the Hebrew letters of a root
 * when it's first discovered during typing.
 * 
 * @param {Object} props
 * @param {Object} props.flagData - Root flag data from GamePanel state
 * @param {string} props.flagData.rootId - Hebrew root ID
 * @param {Object} props.flagData.position - Position info { verseIndex, wordIndex, rootStartIdx, rootEndIdx }
 * @param {number} props.flagData.timestamp - When the flag was triggered
 * @param {Function} props.onHide - Callback when flag should be hidden (after animation)
 */
const RootFlag = ({ flagData, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const rootData = getRootDisplayData(flagData.rootId);
  
  useEffect(() => {
    // Show flag with slight delay for smooth animation
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    // Auto-hide after 2 seconds
    const hideTimer = setTimeout(() => {
      setIsExiting(true);
      
      // Call onHide after exit animation completes
      const removeTimer = setTimeout(() => {
        if (onHide) onHide();
      }, 300);
      
      return () => clearTimeout(removeTimer);
    }, 2000);
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [flagData.rootId, onHide]);
  
  if (!rootData) return null;
  
  // Calculate position - this would need to be integrated with VerseScroll
  // For now, we'll use a simple centered overlay
  // In Phase 2.2, we'll integrate with VerseScroll for precise positioning
  
  const flagClass = `root-flag ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`;
  
  return (
    <div className={flagClass}>
      <div className="root-flag-content">
        <div className="root-flag-header">
          <span className="root-flag-icon">🎯</span>
          <span className="root-flag-title">Root found!</span>
        </div>
        
        <div className="root-flag-body">
          <div className="root-flag-hebrew">{rootData.hebrew}</div>
          <div className="root-flag-details">
            <div className="root-flag-sbl">{rootData.sbl}</div>
            <div className="root-flag-gloss">{rootData.gloss}</div>
          </div>
        </div>
        
        <div className="root-flag-footer">
          <span className="root-flag-hint">Added to Lexicon</span>
        </div>
      </div>
      
      {/* Arrow pointing to the root letters */}
      <div className="root-flag-arrow"></div>
    </div>
  );
};

export default RootFlag;