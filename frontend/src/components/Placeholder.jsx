/**
 * Placeholder.jsx
 *
 * Generic placeholder card for Steps 3 (Suitability) and 4 (Report).
 * Rendered in the next phase.
 */

export default function Placeholder({ step, title, description, icon }) {
  return (
    <div className="card fade-in">
      <div className="placeholder-card">
        <div className="placeholder-icon">{icon || '🔒'}</div>
        <div className="placeholder-title">{title}</div>
        <p className="placeholder-desc">{description}</p>
        <span className="placeholder-chip">Coming in the next phase</span>
      </div>
    </div>
  );
}
