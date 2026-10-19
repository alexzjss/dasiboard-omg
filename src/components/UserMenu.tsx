import { useEffect } from 'react'
import type { User } from '../auth/types'
import { getInitials } from '../lib/user'

export function UserMenu({ user, onLogout, onClose, onOpenProfile }: { user: User; onLogout: () => void; onClose: () => void; onOpenProfile: () => void }) {
  const initials = getInitials(user)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      <div className="user-menu-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="user-menu-sheet" role="dialog" aria-label="Menu do usuário">
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
