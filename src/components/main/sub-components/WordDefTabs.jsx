import { useState } from 'react'
import WordDefinition from './WordDefinition'
import WordRootTab from './WordRootTab'
import WordConcordanceTab from './WordConcordanceTab'
import './WordDefTabs.css'

const TABS = ['Word', 'Root', 'Concordance']

/**
 * WordDefTabs — tabbed wrapper for the game's left-panel word information area.
 *
 * Tabs:
 *   Word        — existing WordDefinition content (gloss, segments, explanation)
 *   Root        — mini root card (identity + BDB + discovered words table)
 *   Concordance — mini concordance (discovered verses only, no explanation)
 *
 * Resets to the "Word" tab whenever a new word becomes active.
 */
export default function WordDefTabs({
  word, wordId, sbl, encounterCount, isWordCompleted, onOpenHaber
}) {
  const [activeTab, setActiveTab] = useState('Word')

  return (
    <div className="wdt">
      {/* Tab bar */}
      <div className="wdt__tabs" role="tablist" aria-label="Word information tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`wdt__tab ${activeTab === tab ? 'wdt__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="wdt__content">
        {activeTab === 'Word' && (
          <WordDefinition
            word={word}
            wordId={wordId}
            sbl={sbl}
            encounterCount={encounterCount}
            isWordCompleted={isWordCompleted}
            onOpenHaber={onOpenHaber}
          />
        )}
        {activeTab === 'Root' && (
          <div className="wdt__tab-panel">
            <WordRootTab wordId={isWordCompleted ? wordId : null} />
          </div>
        )}
        {activeTab === 'Concordance' && (
          <div className="wdt__tab-panel">
            <WordConcordanceTab wordId={isWordCompleted ? wordId : null} />
          </div>
        )}
      </div>
    </div>
  )
}
