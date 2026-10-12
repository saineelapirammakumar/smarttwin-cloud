// Loading, error and empty states shared by all pages.
export function LoadingState({ text = 'Loading…' }) {
  return <div className="state"><div className="spinner" aria-hidden="true" /><div role="status">{text}</div></div>;
}
export function ErrorState({ error, onRetry, title = 'Cannot load data from the backend' }) {
  return (
    <div className="state error" role="alert">
      <div className="ico">⚠️</div><b>{title}</b>
      <div className="muted">{error?.message || String(error)}</div>
      <div className="muted">Check that the backend is running (uvicorn on port 8000) and that PostgreSQL is up.</div>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function EmptyState({ title, hint, onRetry }) {
  return (
    <div className="state"><div className="ico">📭</div><b>{title}</b><div className="muted">{hint}</div>
      {onRetry && <button className="btn ghost" onClick={onRetry}>Check again</button>}</div>
  );
}
