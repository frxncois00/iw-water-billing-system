export function Loading({ label = 'Loading…' }) {
  return <div className="loading-wrap" role="status"><span className="spinner" aria-hidden="true" />{label}</div>
}

export function Notice({ type = 'info', children, onClose }) {
  if (!children) return null
  return <div className={`notice notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>
    <span>{children}</span>{onClose && <button type="button" onClick={onClose} aria-label="Dismiss message">×</button>}
  </div>
}

export function EmptyState({ title, description }) {
  return <div className="empty-state"><h3>{title}</h3><p>{description}</p></div>
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>
}
