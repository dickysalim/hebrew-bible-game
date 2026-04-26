/**
 * ProgressPanel — Work in Progress screen
 * Verse chosen: Psalm 27:14 — a call to courageous waiting on the Lord.
 */
const ProgressPanel = () => {
  return (
    <div className="progress-panel">
      <div className="wip-screen">
        {/* Decorative background glyphs */}
        <div className="wip-bg-glyphs" aria-hidden="true">
          <span lang="he">חַ</span>
          <span lang="he">כֵּ</span>
          <span lang="he">ה׃</span>
        </div>

        <div className="wip-content">
          {/* Icon badge */}
          <div className="wip-badge" aria-hidden="true">
            <span className="wip-badge-icon">✦</span>
          </div>

          {/* Headline */}
          <h2 className="wip-title">Progress Tracking</h2>
          <p className="wip-subtitle">Your journey is being carefully recorded.</p>

          {/* Divider */}
          <div className="wip-divider" aria-hidden="true" />

          {/* Bible verse block */}
          <blockquote className="wip-verse">
            <p className="wip-verse-hebrew" lang="he" dir="rtl">
              קַוֵּה אֶל־יְהוָה חֲזַק וְיַאֲמֵץ לִבֶּךָ וְקַוֵּה אֶל־יְהוָה
            </p>
            <p className="wip-verse-text">
              "Wait for the <span className="wip-lord">Lord</span>;
              be strong, and let your heart take courage;
              wait for the <span className="wip-lord">Lord</span>!"
            </p>
            <cite className="wip-verse-ref">— Psalm 27:14 (ESV)</cite>
          </blockquote>

          {/* Status pill */}
          <div className="wip-status-pill" role="status">
            <span className="wip-status-dot" aria-hidden="true" />
            Work in Progress
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPanel;