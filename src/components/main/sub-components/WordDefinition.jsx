import './WordDefinition.css'

export default function WordDefinition({
  word, wordId, sbl, encounterCount, isWordCompleted, onOpenHaber
}) {

  if (!word || !isWordCompleted) {
    return (
      <div className="word-definition empty">
        <div className="empty-message">
          <span className="empty-icon">✍️</span>
          <p>Type the word to reveal its meaning</p>
        </div>
      </div>
    )
  }

  const { gloss, pos, segments, explanation } = word

  const prefixSegment = segments.find(s => s.type === 'prefix')
  const rootSegment = segments.find(s => s.type === 'root')
  const suffixSegment = segments.find(s => s.type === 'suffix')

  const getEncounterText = (count) => {
    if (count === 1) return '1st time'
    if (count === 2) return '2nd time'
    if (count === 3) return '3rd time'
    return `${count}th time`
  }

  const renderExplanation = (text) => {
    if (!text) return null
    const paragraphs = text.split('\n\n')
    return paragraphs.map((para, idx) => {
      const html = para.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      return (
        <p
          key={idx}
          className="explanation-paragraph"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    })
  }

  const renderHebrewWord = () => {
    return segments.map((segment, idx) => {
      const letters = segment.letters.join('')
      let colorClass = ''
      if (segment.type === 'prefix') colorClass = 'prefix-color'
      if (segment.type === 'root') colorClass = 'root-color'
      if (segment.type === 'suffix') colorClass = 'suffix-color'
      return (
        <span key={idx} className={`hebrew-segment ${colorClass}`}>
          {letters}
        </span>
      )
    })
  }

  const renderSegmentRow = (segment, type) => {
    if (!segment) return null
    const letters = segment.letters.join('')
    const gloss = segment.gloss || ''
    let segSbl = ''
    if (type === 'prefix') segSbl = word.prefix_sbl || `[${type} SBL]`
    if (type === 'root') segSbl = word.root_sbl || `[${type} SBL]`
    if (type === 'suffix') segSbl = word.suffix_sbl || `[${type} SBL]`
    let colorClass = ''
    if (type === 'prefix') colorClass = 'prefix-color'
    if (type === 'root') colorClass = 'root-color'
    if (type === 'suffix') colorClass = 'suffix-color'
    return (
      <div className="segment-row-compact">
        <div className="segment-hebrew">
          <span className={`hebrew-letters ${colorClass}`}>{letters}</span>
        </div>
        <div className="segment-sbl">{segSbl}</div>
        <div className="segment-gloss">{gloss}</div>
      </div>
    )
  }

  return (
    <div className={`word-definition${encounterCount === 1 ? ' is-new' : ''}`}>
      {encounterCount === 1 && (
        <div className="new-badge">New</div>
      )}

      <div className="wd-word-scroll">
        <div className="word-definition-header">
          <div className="word-headline-column">
            <div className="hebrew-word-display">
              {renderHebrewWord()}
            </div>
            <div className="sbl-transliteration">{sbl}</div>
            <div className="english-gloss">{gloss}</div>
          </div>
          <div className="segment-breakdown-column">
            {renderSegmentRow(prefixSegment, 'prefix')}
            {renderSegmentRow(rootSegment, 'root')}
            {renderSegmentRow(suffixSegment, 'suffix')}
          </div>
        </div>

        <div className="word-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Part of speech:</span>
            <span className="metadata-value">{pos}</span>
          </div>
          <span className="metadata-separator">•</span>
          <div className="metadata-item">
            <span className="metadata-label">Encounter:</span>
            <span className="metadata-value">{getEncounterText(encounterCount)}</span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="explanation-section">
          <div className="explanation-label">Explanation</div>
          <div className="explanation-content">
            {renderExplanation(explanation)}
          </div>
        </div>
      </div>

      <button className="haber-open-btn" onClick={onOpenHaber}>
        Ask Haber
      </button>
    </div>
  )
}
