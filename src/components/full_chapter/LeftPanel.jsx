import { getWord } from '../../lib/lexiconCache'
import WordDefTabs from '../main/sub-components/WordDefTabs'

// ── Desktop left panel ─────────────────────────────────────────────────────
// Shows WordDefTabs when a word is clicked in the verse text.
// Falls back to a prompt placeholder when nothing is selected.

function NoWordPlaceholder() {
  return (
    <div className="fc-wip">
      <span className="fc-wip__icon" aria-hidden="true">👆</span>
      <p>Click any Hebrew word in the text to see its definition, root, concordance, and notes.</p>
    </div>
  )
}

export default function LeftPanel({ userId, chapterMeta, selectedWord, lemmaMap }) {
  // Derive all data for WordDefTabs from the clicked word
  const wordId  = selectedWord?.word?.heb_consonant ?? ''
  const sbl     = selectedWord?.word?.sbl ?? ''
  const wordData = wordId ? getWord(wordId) : null

  return (
    <div className="fc-left">
      {selectedWord ? (
        // Active: show live word detail panel
        <WordDefTabs
          word={wordData}
          activeWord={selectedWord.word}
          lemmaMap={lemmaMap}
          wordId={wordId}
          sbl={sbl}
          encounterCount={2}       // not "new" — already encountered
          isWordCompleted={true}   // full chapter = all words done
          onOpenHaber={() => {}}   // Haber not available in FC view
          isWordNew={false}
          userId={userId}
          book={chapterMeta?.book}
          chapter={chapterMeta?.chapter}
          verseNumber={selectedWord.verseObj?.verse}
        />
      ) : (
        <NoWordPlaceholder />
      )}
    </div>
  )
}
