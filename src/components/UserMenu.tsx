import { useLayoutEffect, useRef } from 'react'
import type { User } from '../auth/types'
import { useDialogFocus } from '../lib/useDialogFocus'
import { getInitials } from '../lib/user'

const POPOVER_WIDTH = 280

export function UserMenu({ user, anchor, onLogout, onClose, onOpenProfile }: { user: User; anchor?: HTMLElement | null; onLogout: () => void; onClose: () => void; onOpenProfile: () => void }) {
  const initials = getInitials(user)
  const sheetRef = useRef<HTMLDivElement>(null)
  useDialogFocus(sheetRef, onClose, anchor)

  // No desktop (>= 1024px) o CSS trata a folha como popover; aqui só calculamos onde ancorar.
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el || !anchor || !anchor.isConnected) return
    const r = anchor.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 8))
    el.style.setProperty('--pop-left', `${left}px`)
    if (r.top > window.innerHeight / 2) {
      el.style.setProperty('--pop-bottom', `${window.innerHeight - r.top + 8}px`)
      el.style.setProperty('--pop-top', 'auto')
    } else {
      el.style.setProperty('--pop-top', `${r.bottom + 8}px`)
      el.style.setProperty('--pop-bottom', 'auto')
    }
  }, [anchor])

  return (
    <>
      <div className="user-menu-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="user-menu-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Menu do usuário">
        <div className="user-menu-handle" aria-hidden="true" />
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div className="user-menu-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <div className="user-menu-items">
          <button className="user-menu-item" onClick={() => { onOpenProfile(); onClose() }}>
            <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span>Meu perfil</span>
          </button>
          <button className="user-menu-item user-menu-logout" onClick={() => { onLogout(); onClose() }}>
            <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </>
  )
}
