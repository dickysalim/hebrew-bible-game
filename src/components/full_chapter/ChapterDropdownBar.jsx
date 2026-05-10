import { useState } from 'react'
import { CHAPTER_REGISTRY } from '../../utils/useChapterLoader'

// Derive unique books (in registry order, de-duped)
const REGISTRY_BOOKS = [...new Set(CHAPTER_REGISTRY.map(e => e.book))]

export default function ChapterDropdownBar({ selectedStageIndex, onSelect, completedStageIndexes }) {
  const selectedEntry = CHAPTER_REGISTRY.find(e => e.stageIndex === selectedStageIndex)
  const [selectedBook, setSelectedBook] = useState(selectedEntry?.book ?? REGISTRY_BOOKS[0])

  // A chapter is accessible in Full Chapter mode only if it has been completed.
  const isAccessible = (si) => completedStageIndexes.has(si)

  const handleBookChange = (e) => {
    const book = e.target.value
    setSelectedBook(book)
    // Auto-select the first accessible chapter in the new book
    const chaptersForBook = CHAPTER_REGISTRY.filter(c => c.book === book)
    const first = chaptersForBook.find(c => isAccessible(c.stageIndex))
    if (first) onSelect(first.stageIndex)
  }

  const handleChapterChange = (e) => {
    const si = Number(e.target.value)
    if (isAccessible(si)) onSelect(si)
  }

  const chaptersForBook = CHAPTER_REGISTRY.filter(e => e.book === selectedBook)

  // A book is selectable if it has at least one accessible chapter
  const bookHasProgress = (book) =>
    CHAPTER_REGISTRY.some(e => e.book === book && isAccessible(e.stageIndex))

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
          const accessible = isAccessible(entry.stageIndex)
          return (
            <option
              key={entry.stageIndex}
              value={entry.stageIndex}
              disabled={!accessible}
            >
              {accessible ? `Chapter ${entry.chapter}` : `Chapter ${entry.chapter} — locked`}
            </option>
          )
        })}
      </select>
    </div>
  )
}
