// ── Confirm Dialog — accessible replacement for window.confirm ────────────────
import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const dialogId   = 'confirm-dialog-title'

  // Focus the confirm button when opening
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50)
  }, [open])

  // Keyboard: Escape → cancel
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const colors = {
    danger:  { icon: '#ef4444', btn: 'linear-gradient(135deg,#ef4444,#dc2626)', iconBg: 'rgba(239,68,68,0.12)' },
    warning: { icon: '#f59e0b', btn: 'linear-gradient(135deg,#f59e0b,#d97706)', iconBg: 'rgba(245,158,11,0.12)' },
    info:    { icon: '#3b82f6', btn: 'linear-gradient(135deg,#3b82f6,#2563eb)', iconBg: 'rgba(59,130,246,0.12)' },
  }[variant]

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={dialogId}
    >
      <div
        className="w-full max-w-sm rounded-2xl animate-in"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: colors.iconBg }}>
              <AlertTriangle size={18} style={{ color: colors.icon }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id={dialogId} className="font-display font-bold text-base mb-1"
                  style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: colors.btn, boxShadow: `0 4px 16px ${colors.icon}44` }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook for easy use ─────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { onConfirm: () => void }) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        ...opts,
        onConfirm: () => { setState(null); resolve(true) },
      })
    })
  }, [])

  const cancel = useCallback(() => {
    setState(null)
  }, [])

  const Dialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel ?? 'Excluir'}
      variant={state.variant ?? 'danger'}
      onConfirm={state.onConfirm}
      onCancel={cancel}
    />
  ) : null

  return { confirm, Dialog }
}
