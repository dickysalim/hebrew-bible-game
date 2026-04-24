/**
 * StreakBar — animated pip-based streak counter
 * Props: current (number), total (number), label (string)
 */
export default function StreakBar({ current, total, label }) {
  return (
    <div className="streak-bar-wrap" aria-label={`${label}: ${current} of ${total}`}>
      <div className="streak-bar-label">
        <span>{label}</span>
        <span className="streak-count">{current}/{total}</span>
      </div>
      <div className="streak-pips" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`streak-pip${i < current ? ' streak-pip--active' : ''}`}
            style={{ animationDelay: i < current ? `${i * 0.04}s` : '0s' }}
          />
        ))}
      </div>
    </div>
  )
}
