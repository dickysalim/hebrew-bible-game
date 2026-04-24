/**
 * QuizCard — reusable multiple-choice quiz UI
 * Props:
 *   letter     — Hebrew glyph to display (string)
 *   name       — letter name to display below glyph (string, optional)
 *   choices    — array of { id, label } objects (4 items)
 *   onChoice   — fn(id) called when a choice is clicked
 *   feedback   — null | 'correct' | 'wrong'
 *   selectedId — the id that was last selected
 *   correctId  — the correct answer id
 */
export default function QuizCard({
  letter,
  name,
  choices,
  onChoice,
  feedback,
  selectedId,
  correctId,
}) {
  return (
    <div className={`quiz-card${feedback === 'wrong' ? ' quiz-card--shake' : ''}`}>
      {/* Big Hebrew letter */}
      <div className={`quiz-letter-display${feedback === 'correct' ? ' quiz-letter--correct' : ''}`}>
        <span className="quiz-glyph" lang="he">{letter}</span>
        {name && <span className="quiz-glyph-name">{name}</span>}
      </div>

      {/* Feedback message */}
      <div className={`quiz-feedback${feedback ? ' quiz-feedback--visible' : ''}`}>
        {feedback === 'correct' && <span className="quiz-feedback--correct">✓ Correct!</span>}
        {feedback === 'wrong' && <span className="quiz-feedback--wrong">✗ Try again</span>}
        {!feedback && <span>&nbsp;</span>}
      </div>

      {/* Choice buttons */}
      <div className="quiz-choices" role="group" aria-label="Answer choices">
        {choices.map((c) => {
          let btnClass = 'quiz-btn'
          if (feedback && c.id === correctId) btnClass += ' quiz-btn--correct'
          else if (feedback === 'wrong' && c.id === selectedId) btnClass += ' quiz-btn--wrong'
          return (
            <button
              key={c.id}
              id={`quiz-choice-${c.id}`}
              className={btnClass}
              onClick={() => onChoice(c.id)}
              disabled={!!feedback}
              aria-pressed={selectedId === c.id}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
