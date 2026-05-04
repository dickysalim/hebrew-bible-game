import { useState } from 'react'
import ChapterNotesEditor from './ChapterNotesEditor'

const FC_TABS = [
  { id: 'verse-notes',  label: 'Verse Notes' },
  { id: 'lemma',        label: 'Lemma' },
  { id: 'root',         label: 'Root' },
  { id: 'concordance',  label: 'Concordance' },
]

function WipPlaceholder({ icon, message }) {
  return (
    <div className="fc-wip">
      <span className="fc-wip__icon" aria-hidden="true">{icon}</span>
      <p>{message}</p>
    </div>
  )
}

export default function LeftPanel({ userId, chapterMeta }) {
  const [activeTab, setActiveTab] = useState('verse-notes')

  return (
    <div className="fc-left">
      {/* ── Top pane: tabbed content ── */}
      <div className="fc-left__top">
        <div className="fc-notes__tabs" role="tablist" aria-label="Study panel tabs">
          {FC_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`fc-notes__tab ${activeTab === tab.id ? 'fc-notes__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="fc-notes__body">
          {activeTab === 'verse-notes' && (
            <WipPlaceholder icon="📝" message="Verse notes coming soon." />
          )}
          {activeTab === 'lemma' && (
            <WipPlaceholder icon="🔤" message="Click a word in the text to see its lemma entry." />
          )}
          {activeTab === 'root' && (
            <WipPlaceholder icon="🌱" message="Click a word in the text to see its root." />
          )}
          {activeTab === 'concordance' && (
            <WipPlaceholder icon="🔍" message="Click a word in the text to see concordance data." />
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="fc-left__divider" aria-hidden="true" />

      {/* ── Bottom pane: Chapter Notes (header is rendered by the editor itself) ── */}
      <div className="fc-left__bottom">
        <div className="fc-left__bottom-body" dir="ltr">
          <ChapterNotesEditor
            userId={userId}
            book={chapterMeta?.book ?? ''}
            chapter={chapterMeta?.chapter ?? 0}
          />
        </div>
      </div>
    </div>
  )
}
