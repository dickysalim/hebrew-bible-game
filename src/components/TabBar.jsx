import React from 'react';

const TABS = [
  { id: 'main',         label: 'Reading',  icon: '📖' },
  { id: 'full_chapter', label: 'Chapter',  icon: '📜' },
  { id: 'lexicon',      label: 'Lexicon',  icon: '🔤' },
  { id: 'progress',     label: 'Progress', icon: '📊' },
];

const TabBar = ({ activeTab, onTabChange, newRootsCount = 0, onBackToMenu }) => {
  return (
    <div className="tab-bar">
      {/* Back to menu — left on desktop, hidden on mobile (uses hamburger in verse header) */}
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
        {TABS.map((tab) => (
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
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
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

      {/* Mobile-only back button inside tab bar (right side) */}
      {onBackToMenu && (
        <button
          className="tab-back-btn tab-back-btn--mobile"
          onClick={onBackToMenu}
          aria-label="Back to main menu"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default TabBar;