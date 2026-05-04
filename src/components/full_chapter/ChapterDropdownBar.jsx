import { useState } from 'react'
import { CHAPTER_REGISTRY } from '../../utils/useChapterLoader'

// Derive unique books (in registry order, de-duped)
const REGISTRY_BOOKS = [...new Set(CHAPTER_REGISTRY.map(e => e.book))]

export default function ChapterDropdownBar({ selectedStageIndex, onSelect, completedStageIndexes }) {
  const selectedEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === selectedStageIndex)
  const [selectedBook, setSelectedBook] = useState(selectedEntry?.book ?? REGISTRY_BOOKS[0])

  // When the outer selection changes (e.g. on mount), sync the book
  // so the chapter dropdown stays coherent.
  const handleBookChange = (e) => {
    const book = e.target.value
    setSelectedBook(book)
    // Auto-select the first completed chapter in the new book, or just first
    const chaptersForBook = CHAPTER_REGISTRY.filter(c => c.book === book)
    const firstDone = chaptersForBook.find(c => completedStageIndexes.has(c.stageIndex))
    if (firstDone) onSelect(firstDone.stageIndex)
  }

  const handleChapterChange = (e) => {
    const si = Number(e.target.value)
    if (completedStageIndexes.has(si)) onSelect(si)
  }

  const chaptersForBook = CHAPTER_REGISTRY.filter(e => e.book === selectedBook)

  // A book is "active" (not disabled) if it has at least one completed chapter
  const bookHasProgress = (book) =>
    CHAPTER_REGISTRY.some(e => e.book === book && completedStageIndexes.has(e.stageIndex))

  return (
    <div className="fc-dropbar">
      <span className="fc-dropbar__label">Reading</span>

      {/* Book select */}
      <select
        className="fc-dropbar__select"
        value={selectedBook}
        onChange={handleBookChange}
        aria-label="Select book"
      >
        {REGISTRY_BOOKS.map(book => (
          <option
            key={book}
            value={book}
            disabled={!bookHasProgress(book)}
            className={!bookHasProgress(book) ? 'fc-dropbar__opt--dim' : ''}
          >
            {book}
          </option>
        ))}
      </select>

      {/* Chapter select */}
      <select
        className="fc-dropbar__select"
        value={selectedStageIndex}
        onChange={handleChapterChange}
        aria-label="Select chapter"
      >
        {chaptersForBook.map(entry => {
          const done = completedStageIndexes.has(entry.stageIndex)
          return (
            <option
              key={entry.stageIndex}
              value={entry.stageIndex}
              disabled={!done}
            >
              {done ? `Chapter ${entry.chapter}` : `Chapter ${entry.chapter} — locked`}
            </option>
          )
        })}
      </select>
    </div>
  )
}
