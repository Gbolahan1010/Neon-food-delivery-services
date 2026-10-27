/** Small shared pieces for loading, errors, empty states and status badges. */

export function Loading({ label = 'Loading' }) {
  return (
    <p className="loading" role="status">
      <span className="loading-dot" aria-hidden="true" />
      {label}...
    </p>
  );
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      <p>{error.message || String(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-small btn-ghost" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ children, tone = 'info' }) {
  return (
    <div className={`alert alert-${tone}`} role="status">
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  return <span className={`badge badge-${status}`}>{children}</span>;
}
