import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { Icon } from '../../components/Icon'
import { getInitials } from '../../lib/user'
import { ThemeSelector } from '../../components/ThemeSelector'

export function PerfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const initials = getInitials(user)

  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="app-shell profile-shell">
      <div className="profile-content">
        <button className="ent-back-btn" onClick={goBack} aria-label="Voltar">
          <Icon name="arrow" /><span>Voltar</span>
        </button>
        <div className="profile-hero">
          <div className="profile-avatar-lg">
            {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div>
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-section">
          <h2 className="section-label">Conta</h2>
          <div className="profile-items">
            <div className="profile-item"><span className="profile-item-label">E-mail</span><span className="profile-item-value">{user.email}</span></div>
            <div className="profile-item"><span className="profile-item-label">Instituição</span><span className="profile-item-value">USP — EACH</span></div>
          </div>
        </div>
        <div className="profile-section">
          <h2 className="section-label" id="theme-label">Aparência</h2>
          <ThemeSelector labelledBy="theme-label" />
        </div>
        <button className="profile-logout-btn" onClick={() => void logout()}>
          <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sair da conta
        </button>
      </div>
    </main>
  )
}
