import type { User } from '../../auth/types'
import { Icon } from '../../components/Icon'
import { getInitials } from '../../lib/user'

const appLogo = '/logo.png'

export function AppTopbar({ user, onOpenUserMenu }: { user: User; onOpenUserMenu: () => void }) {
  const initials = getInitials(user)
  return (
    <header className="topbar">
      <div className="topbar-brand"><img src={appLogo} alt="daSIboard" className="topbar-logo" /></div>
      <div className="topbar-actions">
        <button className="icon-button notification" aria-label="Notificações"><Icon name="bell" /><span></span></button>
        <div className="user-summary">
          <div className="user-name-wrap"><strong>{user.name.split(' ')[0]}</strong></div>
          <button className="avatar" aria-label="Abrir menu do usuário" onClick={onOpenUserMenu}>
            {user.picture ? <img src={user.picture} alt={`Foto de ${user.name}`} /> : initials}
          </button>
        </div>
      </div>
    </header>
  )
}
