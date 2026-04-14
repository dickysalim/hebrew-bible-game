import React, { useEffect } from 'react';

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
 * @param {Object} props.style - CSS style object for positioning
 */
const RootFlag = ({ flagData, onHide, style }) => {
  useEffect(() => {
    // Call onHide after animation completes (1.5 seconds)
    const timer = setTimeout(() => {
      if (onHide) onHide();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [onHide]);
  
  return (
    <div className="root-flag" style={style}>
      <div className="root-flag-content">
        Root Found
      </div>
    </div>
  );
};

export default RootFlag;