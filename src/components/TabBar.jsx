import React from 'react';

const TabBar = ({ activeTab, onTabChange, newRootsCount = 0, onBackToMenu }) => {
  const tabs = [
    { id: 'main', label: 'Reading' },
    { id: 'full_chapter', label: 'Chapter' },
    { id: 'lexicon', label: 'Lexicon' },
    { id: 'progress', label: 'Progress' },
  ];

  return (
    <div className="tab-bar">
      {/* Back to menu always on the LEFT — universal UX pattern */}
      {onBackToMenu && (
        <button
          className="tab-back-btn"
          onClick={onBackToMenu}
          aria-label="Back to main menu"
          title="Back to Main Menu"
        >
          ← Menu
        </button>
      )}

      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
            aria-label={
              tab.id === 'lexicon' && newRootsCount > 0
                ? `Lexicon, ${newRootsCount} new root${newRootsCount > 1 ? 's' : ''} discovered`
                : tab.label
            }
          >
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'lexicon' && newRootsCount > 0 && (
              <div className="tab-badge" key={newRootsCount}>
                {newRootsCount > 9 ? '9+' : newRootsCount}
              </div>
            )}
            {activeTab === tab.id && <div className="tab-indicator" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabBar;