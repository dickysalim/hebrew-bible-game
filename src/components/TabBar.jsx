import React from 'react';

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'main', label: 'Main' },
    { id: 'lexicon', label: 'Lexicon' },
    { id: 'progress', label: 'Progress' },
  ];

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span className="tab-label">{tab.label}</span>
            {activeTab === tab.id && <div className="tab-indicator" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabBar;