import { ReactNode } from 'react'

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, description }: {
  eyebrow?: string; title: string; description?: string
}) {
  return (
    <div className="page-header anim-fade-up stagger-1">
      {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-desc">{description}</p>}
      <style>{`
        .page-header { margin-bottom: 28px; }
        .page-eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: var(--primary); margin-bottom: 6px;
        }
        .page-title {
          font-size: 28px; font-weight: 700; color: var(--text);
          line-height: 1.2; margin-bottom: 6px;
        }
        .page-desc { font-size: 14px; color: var(--text-muted); }
      `}</style>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <>
      <div className={`card ${className}`}>{children}</div>
      <style>{`
        .card {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 20px;
          backdrop-filter: blur(8px);
        }
      `}</style>
    </>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md'

export function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled, type = 'button', className = '',
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant
  size?: BtnSize; disabled?: boolean; type?: 'button' | 'submit'; className?: string
}) {
  return (
    <>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn btn--${variant} btn--${size} ${className}`}
      >
        {children}
      </button>
      <style>{`
        .btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; border-radius: 8px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; border: 1px solid transparent;
          font-size: 14px; white-space: nowrap;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn--md { padding: 8px 16px; }
        .btn--sm { padding: 5px 12px; font-size: 12px; }
        .btn--primary {
          background: var(--primary); color: white;
          border-color: var(--primary);
        }
        .btn--primary:not(:disabled):hover { filter: brightness(1.15); }
        .btn--ghost {
          background: var(--glass); color: var(--text-muted);
          border-color: var(--glass-border);
        }
        .btn--ghost:not(:disabled):hover { color: var(--text); background: var(--glass-border); }
        .btn--danger {
          background: rgba(239,68,68,.15); color: var(--danger);
          border-color: rgba(239,68,68,.3);
        }
        .btn--danger:not(:disabled):hover { background: rgba(239,68,68,.25); }
      `}</style>
    </>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ text }: { text?: string }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      {text && <span>{text}</span>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'

export function Badge({ children, color = 'default' }: { children: ReactNode; color?: BadgeColor }) {
  const map: Record<BadgeColor, string> = {
    primary: 'rgba(124,58,237,.2)',
    success: 'rgba(34,197,94,.15)',
    warning: 'rgba(245,158,11,.15)',
    danger: 'rgba(239,68,68,.15)',
    info: 'rgba(56,189,248,.15)',
    default: 'var(--glass)',
  }
  const textMap: Record<BadgeColor, string> = {
    primary: 'var(--primary)', success: 'var(--success)',
    warning: 'var(--warning)', danger: 'var(--danger)',
    info: 'var(--info)', default: 'var(--text-muted)',
  }
  return (
    <span style={{
      background: map[color], color: textMap[color],
      fontSize: 11, fontWeight: 600, padding: '2px 7px',
      borderRadius: 5, display: 'inline-flex', alignItems: 'center',
    }}>
      {children}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 480 }: {
  open: boolean; onClose: () => void; title?: string;
  children: ReactNode; maxWidth?: number
}) {
  if (!open) return null
  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-box" style={{ maxWidth }}>
          {title && (
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
            </div>
          )}
          {!title && (
            <button className="modal-close modal-close--abs" onClick={onClose} aria-label="Fechar">✕</button>
          )}
          <div className="modal-body">{children}</div>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .modal-box {
          background: var(--bg2); border: 1px solid var(--glass-border);
          border-radius: 16px; width: 100%; max-height: 90vh;
          overflow: auto; position: relative;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 0;
        }
        .modal-title { font-size: 17px; font-weight: 600; color: var(--text); }
        .modal-body { padding: 20px; }
        .modal-close {
          width: 28px; height: 28px; border-radius: 6px;
          border: none; background: var(--glass); cursor: pointer;
          color: var(--text-muted); font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .modal-close:hover { color: var(--text); background: var(--glass-border); }
        .modal-close--abs { position: absolute; top: 14px; right: 14px; }
      `}</style>
    </>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description }: {
  icon?: string; title: string; description?: string
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      <style>{`
        .empty-state {
          text-align: center; padding: 48px 24px;
          color: var(--text-muted);
        }
        .empty-icon { font-size: 36px; margin-bottom: 12px; }
        .empty-title { font-size: 15px; font-weight: 500; color: var(--text-muted); }
        .empty-desc { font-size: 13px; color: var(--text-dim); margin-top: 4px; }
      `}</style>
    </div>
  )
}
