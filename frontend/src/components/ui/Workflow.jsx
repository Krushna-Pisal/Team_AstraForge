import { Link } from "react-router-dom";
import { Children, cloneElement, isValidElement, useId } from "react";
export function PageTitle({
  eyebrow = "ADVISORY WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Steps({ current }) {
  return (
    <ol className="stepper" aria-label="Assessment progress">
      {["Customer", "Product & amount", "Results", "Customer fit"].map(
        (text, i) => (
          <li
            key={text}
            className={
              i === current ? "current" : i < current ? "complete" : ""
            }
            aria-current={i === current ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {text}
          </li>
        ),
      )}
    </ol>
  );
}
export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id + "-0"}>{label}</label>
      {Children.map(children, (child, index) =>
        isValidElement(child)
          ? cloneElement(child, {
              id: child.props.id || id + "-" + index,
              "aria-label": child.props["aria-label"] || label,
              "aria-describedby": hint ? id + "-hint" : undefined,
            })
          : child,
      )}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export function ErrorNotice({ error, retry }) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <div>
        <strong>Unable to complete this step</strong>
        <p>{error}</p>
      </div>
      {retry && (
        <button className="btn-secondary" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function Loading({ text = "Calculating results…" }) {
  return (
    <div role="status" aria-live="polite">
      <p className="muted loading-label">{text}</p>
      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
      <div className="skeleton tall" />
    </div>
  );
}
export function EmptyState({ title, description, to, action }) {
  return (
    <div className="card empty-state">
      <div className="empty-mark">↗</div>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {to && (
        <Link className="btn-primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
export function Badge({ value }) {
  const tone = ["PASS", "suitable"].includes(value)
    ? "positive"
    : ["MISMATCH", "review_required"].includes(value)
      ? "negative"
      : ["WARNING", "suitable_with_warnings"].includes(value)
        ? "warning"
        : "";
  return (
    <span className={"badge " + tone}>
      {(value || "Pending").replaceAll("_", " ")}
    </span>
  );
}
export function Metric({ label, value, hint, tone = "" }) {
  return (
    <div className="metric card">
      <p>{label}</p>
      <strong className={tone}>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
