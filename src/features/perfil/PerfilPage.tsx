import { useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { Icon } from '../../components/Icon'
import { getInitials } from '../../lib/user'
import { getThemePref, setThemePref, type ThemePref } from '../../lib/theme'

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

export function PerfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [themePref, setThemePrefState] = useState<ThemePref>(getThemePref)
  const themeRefs = useRef<(HTMLButtonElement | null)[]>([])
  if (!user) return null
  const initials = getInitials(user)

  function chooseTheme(pref: ThemePref) {
    setThemePrefState(pref)
    setThemePref(pref)
  }

  function onThemeKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
    chooseTheme(THEME_OPTIONS[next].value)
    themeRefs.current[next]?.focus()
  }

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
          <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
            {THEME_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                ref={el => { themeRefs.current[i] = el }}
                type="button"
                role="radio"
                aria-checked={themePref === opt.value}
                tabIndex={themePref === opt.value ? 0 : -1}
                className={`segmented-option${themePref === opt.value ? ' active' : ''}`}
                onClick={() => chooseTheme(opt.value)}
                onKeyDown={e => onThemeKeyDown(e, i)}
              >{opt.label}</button>
            ))}
          </div>
        </div>
        <button className="profile-logout-btn" onClick={() => void logout()}>
          <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sair da conta
        </button>
      </div>
    </main>
  )
}
