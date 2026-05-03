import { useState, useEffect } from 'react'
import WordDefinition from './WordDefinition'
import WordRootTab from './WordRootTab'
import WordConcordanceTab from './WordConcordanceTab'
import VerseNotesTab from './VerseNotesTab'
import './WordDefTabs.css'

const TABS = ['Word', 'Root', 'Concordance', 'My Notes']

/**
 * WordDefTabs — the outer .word-definition card with a tab bar inside it.
 *
 * Tabs:
 *   Word        — existing WordDefinition inner content
 *   Root        — mini root card (identity + BDB + discovered words table)
 *   Concordance — mini concordance (discovered verses only)
 *
 * Props:
 *   isWordNew   boolean — true only on first discovery, while still on that word;
 *               cleared by GamePanel when the user moves to a different word
 */
export default function WordDefTabs({
  word, wordId, sbl, encounterCount, isWordCompleted, onOpenHaber,
  isWordNew = false,
  userId, book, chapter, verseNumber,
}) {
  const [activeTab, setActiveTab] = useState('Word')

  // Reset to the Word tab whenever the selected word changes,
  // but preserve the My Notes tab since it's per-verse not per-word.
  useEffect(() => {
    setActiveTab(prev => (prev === 'My Notes' ? prev : 'Word'))
  }, [wordId])

  return (
    <div className={`word-definition${isWordNew ? ' is-new' : ''}`}>
      {/* "New" badge — inside the card, above tabs */}
      {isWordNew && <div className="new-badge">New</div>}

      {/* Tab bar — lives inside the card */}
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
            noWrapper
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
        {activeTab === 'My Notes' && (
          <div className="wdt__tab-panel">
            <VerseNotesTab
              userId={userId}
              book={book}
              chapter={chapter}
              verse={verseNumber}
            />
          </div>
        )}
      </div>
    </div>
  )
}

