/**
 * FullChapter — Work in Progress screen
 * Verse chosen: Isaiah 40:31 — a beloved promise for those who wait.
 */
export default function FullChapter() {
  return (
    <div className="full-chapter-panel">
      <div className="wip-screen">
        {/* Decorative background glyphs */}
        <div className="wip-bg-glyphs" aria-hidden="true">
          <span lang="he">ק</span>
          <span lang="he">ו</span>
          <span lang="he">ה</span>
        </div>

        <div className="wip-content">
          {/* Icon badge */}
          <div className="wip-badge" aria-hidden="true">
            <span className="wip-badge-icon">✦</span>
          </div>

          {/* Headline */}
          <h2 className="wip-title">Full Chapter View</h2>
          <p className="wip-subtitle">This feature is being crafted with care.</p>

          {/* Divider */}
          <div className="wip-divider" aria-hidden="true" />

          {/* Bible verse block */}
          <blockquote className="wip-verse">
            <p className="wip-verse-hebrew" lang="he" dir="rtl">
              וְקוֵי יְהוָה יַחֲלִיפוּ כֹחַ יַעֲלוּ אֵבֶר כַּנְּשָׁרִים
            </p>
            <p className="wip-verse-text">
              "But those who wait for the <span className="wip-lord">Lord</span> shall renew their strength;
              they shall mount up with wings like eagles;
              they shall run and not be weary;
              they shall walk and not faint."
            </p>
            <cite className="wip-verse-ref">— Isaiah 40:31 (ESV)</cite>
          </blockquote>

          {/* Status pill */}
          <div className="wip-status-pill" role="status">
            <span className="wip-status-dot" aria-hidden="true" />
            Work in Progress
          </div>
        </div>
      </div>
    </div>
  )
}
