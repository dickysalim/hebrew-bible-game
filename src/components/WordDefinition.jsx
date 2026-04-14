import './WordDefinition.css'

export default function WordDefinition({ word, wordId, sbl, encounterCount, isWordCompleted }) {
  // If no word selected or word not completed, show placeholder
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
  
  // Get segment by type
  const prefixSegment = segments.find(s => s.type === 'prefix')
  const rootSegment = segments.find(s => s.type === 'root')
  const suffixSegment = segments.find(s => s.type === 'suffix')
  
  // Format encounter counter
  const getEncounterText = (count) => {
    if (count === 1) return 'First time'
    if (count === 2) return '2nd time'
    if (count === 3) return '3rd time'
    return `${count}th time`
  }

  // Render explanation with bold text and paragraph breaks
  const renderExplanation = (text) => {
    if (!text) return null
    
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n')
    
    return paragraphs.map((para, idx) => {
      // Replace *text* with <strong>text</strong>
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

  // Render Hebrew word with color coding
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

  // Render segment row (prefix, root, or suffix)
  const renderSegmentRow = (segment, type) => {
    if (!segment) return null
    
    const letters = segment.letters.join('')
    const gloss = segment.gloss || ''
    // Get SBL from word-level fields
    let sbl = ''
    if (type === 'prefix') sbl = word.prefix_sbl || `[${type} SBL]`
    if (type === 'root') sbl = word.root_sbl || `[${type} SBL]`
    if (type === 'suffix') sbl = word.suffix_sbl || `[${type} SBL]`
    
    let colorClass = ''
    if (type === 'prefix') colorClass = 'prefix-color'
    if (type === 'root') colorClass = 'root-color'
    if (type === 'suffix') colorClass = 'suffix-color'
    
    return (
      <div className="segment-row">
        <div className="segment-hebrew">
          <span className={`hebrew-letters ${colorClass}`}>{letters}</span>
        </div>
        <div className="segment-sbl">{sbl}</div>
        <div className="segment-gloss">{gloss}</div>
      </div>
    )
  }

  return (
    <div className="word-definition">
      {/* New badge for first encounter */}
      {encounterCount === 1 && (
        <div className="new-badge">New</div>
      )}
      
      {/* 1. Hebrew word with color coding */}
      <div className="hebrew-word-display">
        {renderHebrewWord()}
      </div>
      
      {/* 2. SBL transliteration */}
      <div className="sbl-transliteration">{sbl}</div>
      
      {/* 3. English gloss */}
      <div className="english-gloss">{gloss}</div>
      
      {/* 4. Grammatical position */}
      <div className="grammatical-position">
        <span className="position-label">Part of speech:</span>
        <span className="position-value">{pos}</span>
      </div>
      
      {/* 5. Encounter counter */}
      <div className="encounter-counter">
        <span className="counter-label">Encounter:</span>
        <span className="counter-value">{getEncounterText(encounterCount)}</span>
      </div>
      
      {/* 6. Divider */}
      <div className="divider"></div>
      
      {/* 7. Prefix row */}
      {renderSegmentRow(prefixSegment, 'prefix')}
      
      {/* 8. Root row */}
      {renderSegmentRow(rootSegment, 'root')}
      
      {/* 9. Suffix row */}
      {renderSegmentRow(suffixSegment, 'suffix')}
      
      {/* 10. Divider */}
      <div className="divider"></div>
      
      {/* 11. Explanation paragraph(s) */}
      <div className="explanation-section">
        <div className="explanation-label">Explanation</div>
        <div className="explanation-content">
          {renderExplanation(explanation)}
        </div>
      </div>
    </div>
  )
}